import { db, subscriptionsTable, paymentsTable } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { isFreeUser, paywallEnabled } from "./billing.service.js";

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

/** True when the user may use paid features right now. */
export async function hasAccess(userId: string): Promise<boolean> {
  if (!paywallEnabled() || isFreeUser(userId)) return true;
  return (await getSubscriptionStatus(userId)).active;
}

export type ActivationResult =
  | { activated: true; userId: string; plan: string }
  | { activated: false; reason: "unknown_order" | "already_processed" };

/**
 * Marks an order as paid and extends the owner's subscription, exactly once.
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

    return { activated: true, userId: payment.userId, plan: payment.plan } as const;
  });
}
