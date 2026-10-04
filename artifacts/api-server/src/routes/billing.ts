import { Router, type Request } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { currentUserId } from "../middlewares/requireUser.js";
import { allQuotes, isPlanId, paywallEnabled, quoteFor } from "../services/billing.service.js";
import { activateOrder, getSubscriptionStatus } from "../services/subscription.service.js";
import {
  createOrder,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../lib/razorpay.js";

/** Routes that need no sign-in: the price list and Razorpay's webhook (authenticated by signature). */
export const billingPublicRouter = Router();

billingPublicRouter.get("/billing/plans", (_req, res) => {
  res.json({ currency: "INR", paywallEnabled: paywallEnabled(), plans: allQuotes() });
});

billingPublicRouter.post("/billing/webhook", async (req: Request & { rawBody?: Buffer }, res, next) => {
  try {
    const signature = String(req.header("x-razorpay-signature") ?? "");
    if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
      res.status(400).json({ error: "bad_signature" });
      return;
    }
    const event = req.body as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    // payment.captured: money received. order.paid carries the same payment entity.
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      if (payment?.id && payment.order_id) {
        const result = await activateOrder(payment.order_id, payment.id);
        req.log.info({ orderId: payment.order_id, result: result.activated ? "activated" : result.reason }, "Razorpay webhook processed");
      }
    }
    // Always 200 for a correctly signed call so Razorpay does not retry events we ignore.
    res.json({ received: true });
  } catch (err) {
    next(err); // 500 makes Razorpay retry, which is what we want after a database hiccup
  }
});

/** Routes for the signed-in user. */
const router = Router();

router.get("/billing/status", async (_req, res, next) => {
  try {
    res.json(await getSubscriptionStatus(currentUserId(res)));
  } catch (err) {
    next(err);
  }
});

router.post("/billing/order", async (req, res, next) => {
  try {
    const plan = (req.body as { plan?: unknown } | undefined)?.plan;
    if (!isPlanId(plan)) {
      res.status(400).json({ error: "invalid_plan", message: "Unknown plan." });
      return;
    }
    if (!razorpayConfigured()) {
      res.status(503).json({ error: "payments_not_configured", message: "Payments are not available right now." });
      return;
    }

    const userId = currentUserId(res);
    const quote = quoteFor(plan);
    let order;
    try {
      order = await createOrder({
        amountPaise: quote.totalPaise,
        receipt: `sx_${Date.now().toString(36)}_${userId.slice(-10)}`.slice(0, 40),
        notes: { userId, plan },
      });
    } catch (err) {
      req.log.error({ err }, "Razorpay order creation failed");
      res.status(502).json({ error: "payment_provider_error", message: "Could not start the payment. Please try again." });
      return;
    }

    await db.insert(paymentsTable).values({
      userId,
      orderId: order.id,
      plan,
      months: quote.months,
      amountPaise: quote.totalPaise,
      currency: "INR",
      quote,
    });

    res.json({ orderId: order.id, keyId: razorpayKeyId(), amountPaise: quote.totalPaise, currency: "INR", plan, quote });
  } catch (err) {
    next(err);
  }
});

router.post("/billing/verify", async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
      res.status(400).json({ error: "validation_error", message: "Missing payment details." });
      return;
    }

    const userId = currentUserId(res);
    const [order] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId));
    // Same answer for "no such order" and "someone else's order": never confirm other users' orders exist.
    if (!order || order.userId !== userId) {
      res.status(404).json({ error: "not_found", message: "Order not found." });
      return;
    }
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      res.status(400).json({ error: "bad_signature", message: "Payment could not be verified." });
      return;
    }

    const result = await activateOrder(orderId, paymentId);
    if (!result.activated && result.reason === "unknown_order") {
      res.status(404).json({ error: "not_found", message: "Order not found." });
      return;
    }
    // "already_processed" is fine: the webhook got there first.
    res.json(await getSubscriptionStatus(userId));
  } catch (err) {
    next(err);
  }
});

export default router;
