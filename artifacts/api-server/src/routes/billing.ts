import { Router, type Request } from "express";
import { db, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { currentUserId } from "../middlewares/requireUser.js";
import {
  allQuotes,
  allTopupQuotes,
  isPackId,
  isPlanId,
  isValidSingleCredits,
  paywallEnabled,
  quoteFor,
  singleQuote,
  topupQuote,
  SINGLE_MAX_CREDITS,
  SINGLE_MIN_CREDITS,
  type CreditQuote,
  type Quote,
} from "../services/billing.service.js";
import { AI_COSTS, DEPTH_LABELS, MODULE_COSTS } from "../services/credit-cost.service.js";
import { billingActiveFor, getBalance, recentLedger } from "../services/credits.service.js";
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
  const single = singleQuote(SINGLE_MIN_CREDITS);
  res.json({
    currency: "INR",
    paywallEnabled: paywallEnabled(),
    plans: allQuotes(),
    packs: allTopupQuotes(),
    single: { minCredits: SINGLE_MIN_CREDITS, maxCredits: SINGLE_MAX_CREDITS, perCreditPaise: single.perCreditPaise },
    costs: {
      modules: [
        { label: "ASTRO - Prashna chart (always)", credits: MODULE_COSTS.astro },
        { label: "ASTRO - each extra chart (D3 / D9 / D10)", credits: MODULE_COSTS.astroExtraChart },
        { label: "AJIT - intent", credits: MODULE_COSTS.ajit },
        { label: "MANU - emotion", credits: MODULE_COSTS.manu },
        { label: "SIVI - path simulation", credits: MODULE_COSTS.sivi },
      ],
      ai: (Object.keys(AI_COSTS) as (keyof typeof AI_COSTS)[]).map((d) => ({ label: DEPTH_LABELS[d], credits: AI_COSTS[d] })),
    },
  });
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
    const userId = currentUserId(res);
    res.json({ ...(await getSubscriptionStatus(userId)), creditBalance: await getBalance(userId) });
  } catch (err) {
    next(err);
  }
});

router.get("/billing/credits", async (_req, res, next) => {
  try {
    const userId = currentUserId(res);
    const [balance, ledger] = await Promise.all([getBalance(userId), recentLedger(userId, 25)]);
    res.json({ balance, billingActive: billingActiveFor(userId), ledger });
  } catch (err) {
    next(err);
  }
});

/** Resolves what the browser asked to buy into a server-side price. The browser never sends an amount. */
function resolveProduct(body: Record<string, unknown>):
  | { ok: true; kind: "plan"; id: string; quote: Quote; amountPaise: number; months: number; credits: number }
  | { ok: true; kind: "topup" | "single"; id: string; quote: CreditQuote; amountPaise: number; months: 0; credits: number }
  | { ok: false; error: string; message: string; status: number } {
  const given = [body.plan, body.pack, body.singleCredits].filter((v) => v !== undefined).length;
  if (given !== 1) return { ok: false, status: 400, error: "invalid_product", message: "Choose exactly one of plan, pack or singleCredits." };
  if (body.plan !== undefined) {
    if (!isPlanId(body.plan)) return { ok: false, status: 400, error: "invalid_plan", message: "Unknown plan." };
    const quote = quoteFor(body.plan);
    return { ok: true, kind: "plan", id: body.plan, quote, amountPaise: quote.totalPaise, months: quote.months, credits: quote.credits };
  }
  if (body.pack !== undefined) {
    if (!isPackId(body.pack)) return { ok: false, status: 400, error: "invalid_pack", message: "Unknown credit pack." };
    const quote = topupQuote(body.pack);
    return { ok: true, kind: "topup", id: body.pack, quote, amountPaise: quote.totalPaise, months: 0, credits: quote.credits };
  }
  if (!isValidSingleCredits(body.singleCredits)) {
    return { ok: false, status: 400, error: "invalid_credits", message: `singleCredits must be a whole number from ${SINGLE_MIN_CREDITS} to ${SINGLE_MAX_CREDITS}.` };
  }
  const quote = singleQuote(body.singleCredits);
  return { ok: true, kind: "single", id: "single", quote, amountPaise: quote.totalPaise, months: 0, credits: quote.credits };
}

router.post("/billing/order", async (req, res, next) => {
  try {
    const product = resolveProduct((req.body ?? {}) as Record<string, unknown>);
    if (!product.ok) {
      res.status(product.status).json({ error: product.error, message: product.message });
      return;
    }
    if (!razorpayConfigured()) {
      res.status(503).json({ error: "payments_not_configured", message: "Payments are not available right now." });
      return;
    }

    const userId = currentUserId(res);
    // Top-up packs are the subscriber price; everyone else buys at the single-query rate.
    if (product.kind === "topup" && !(await getSubscriptionStatus(userId)).active) {
      res.status(403).json({ error: "subscription_required", message: "Top-up packs are for subscribers. Pick a plan, or buy credits for a single query." });
      return;
    }

    let order;
    try {
      order = await createOrder({
        amountPaise: product.amountPaise,
        receipt: `sx_${Date.now().toString(36)}_${userId.slice(-10)}`.slice(0, 40),
        notes: { userId, product: product.id, kind: product.kind },
      });
    } catch (err) {
      req.log.error({ err }, "Razorpay order creation failed");
      res.status(502).json({ error: "payment_provider_error", message: "Could not start the payment. Please try again." });
      return;
    }

    await db.insert(paymentsTable).values({
      userId,
      orderId: order.id,
      plan: product.id,
      kind: product.kind,
      months: product.months,
      credits: product.credits,
      amountPaise: product.amountPaise,
      currency: "INR",
      quote: product.quote,
    });

    res.json({
      orderId: order.id,
      keyId: razorpayKeyId(),
      amountPaise: product.amountPaise,
      currency: "INR",
      kind: product.kind,
      product: product.id,
      credits: product.credits,
      description: product.kind === "plan" ? `${(product.quote as Quote).label} subscription` : `${product.credits} credits`,
    });
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
    res.json({ ...(await getSubscriptionStatus(userId)), creditBalance: await getBalance(userId) });
  } catch (err) {
    next(err);
  }
});

export default router;
