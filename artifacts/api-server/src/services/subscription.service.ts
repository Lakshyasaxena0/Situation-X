import { db, subscriptionsTable, paymentsTable } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { paywallEnabled } from "./billing.service.js";
import { grantCredits } from "./credits.service.js";

export type SubscriptionStatus = {
  active: boolean;
  plan: string | null;
  currentPeriodEnd: string | null;
  daysLeft: number;
  paywallEnabled: boolean;
};

const DAY_MS = 86_400_000;

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31 Jan + 1 month must be the end of February, not 3 March.
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const [row] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const end = row?.currentPeriodEnd ?? null;
  const active = end !== null && end.getTime() > Date.now();
  return {
    active,
    plan: row?.plan ?? null,
    currentPeriodEnd: end ? end.toISOString() : null,
    daysLeft: active && end ? Math.ceil((end.getTime() - Date.now()) / DAY_MS) : 0,
    paywallEnabled: paywallEnabled(),
  };
}

export type ActivationResult =
  | { activated: true; userId: string; plan: string; kind: string; credits: number }
  | { activated: false; reason: "unknown_order" | "already_processed" };

/**
 * Marks an order as paid and delivers what was bought, exactly once: a plan extends the
 * subscription and adds its credits, a top-up or single-query purchase only adds credits.
 * The browser callback and the webhook can both arrive (in any order, even together); only the
 * caller that flips the payment from "created" to "paid" extends the period.
 * A purchase made while a subscription is still running is added on top of the remaining time.
 */
export async function activateOrder(orderId: string, paymentId: string): Promise<ActivationResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .update(paymentsTable)
      .set({ status: "paid", paymentId, paidAt: new Date() })
      .where(and(eq(paymentsTable.orderId, orderId), ne(paymentsTable.status, "paid")))
      .returning();

    if (!payment) {
      const [existing] = await tx.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.orderId, orderId));
      return { activated: false, reason: existing ? "already_processed" : "unknown_order" } as const;
    }

    if (payment.kind === "plan" && payment.months > 0) {
      await tx
        .insert(subscriptionsTable)
        .values({ userId: payment.userId, plan: payment.plan, currentPeriodEnd: addMonths(new Date(), payment.months) })
        .onConflictDoUpdate({
          target: subscriptionsTable.userId,
          set: {
            plan: payment.plan,
            currentPeriodEnd: sql`GREATEST(${subscriptionsTable.currentPeriodEnd}, now()) + make_interval(months => ${payment.months})`,
            updatedAt: new Date(),
          },
        });
    }
    if (payment.credits > 0) {
      // Keyed by the order id, so even a repeated delivery cannot add the credits twice.
      await grantCredits(payment.userId, payment.credits, payment.kind === "plan" ? "plan" : payment.kind === "topup" ? "topup" : "single", orderId, { plan: payment.plan, amountPaise: payment.amountPaise }, tx);
    }

    return { activated: true, userId: payment.userId, plan: payment.plan, kind: payment.kind, credits: payment.credits } as const;
  });
}
