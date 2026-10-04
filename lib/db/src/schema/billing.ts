import { pgTable, text, serial, integer, jsonb, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * One row per user: the prepaid subscription that is (or was) active.
 * Paying again before it ends extends `currentPeriodEnd` instead of replacing it.
 * Timestamps carry a time zone on purpose so date arithmetic in SQL is unambiguous.
 */
export const subscriptionsTable = pgTable("subscriptions", {
  // Clerk user id.
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull(), // plan id of the most recent purchase
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * One row per Razorpay order. Created (status "created") when the user starts checkout and
 * flipped to "paid" exactly once, whichever of the browser callback or the webhook arrives first.
 * Amounts are integer paise.
 */
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  orderId: text("order_id").notNull(),
  paymentId: text("payment_id"),
  // What was bought: a plan id ("monthly" ...), a credit pack id ("topup_100" ...) or "single".
  plan: text("plan").notNull(),
  kind: text("kind").notNull().default("plan"), // plan | topup | single
  months: integer("months").notNull(), // subscription months added (0 for credit-only purchases)
  credits: integer("credits").notNull().default(0), // credits granted once the payment is confirmed
  amountPaise: integer("amount_paise").notNull(),
  currency: text("currency").notNull().default("INR"),
  quote: jsonb("quote"), // full price breakdown at the time of purchase (for invoices / disputes)
  status: text("status").notNull().default("created"), // created | paid
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("payments_order_id_idx").on(table.orderId),
  index("payments_user_id_idx").on(table.userId),
]);

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;

/**
 * Prepaid credits. One row per user; the balance can never go below zero (CHECK constraint),
 * so two analyses started at the same moment cannot both spend the last credits.
 */
export const creditWalletsTable = pgTable("credit_wallets", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("credit_wallets_balance_non_negative", sql`${table.balance} >= 0`)]);

/**
 * Append-only history of every credit movement. `delta` is positive for grants and refunds,
 * negative for charges. (reason, ref) is unique when ref is set, so a payment or a refund can
 * be applied only once even if the browser callback and the webhook both arrive.
 */
export const creditLedgerTable = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  delta: integer("delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(), // welcome | plan | topup | single | analysis | refund
  ref: text("ref"), // order id for purchases, "debit:<ledger id>" for refunds
  analysisId: integer("analysis_id"),
  meta: jsonb("meta"), // cost breakdown for analysis charges
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("credit_ledger_user_idx").on(table.userId, table.createdAt),
  uniqueIndex("credit_ledger_reason_ref_idx").on(table.reason, table.ref).where(sql`${table.ref} is not null`),
]);

export type CreditWallet = typeof creditWalletsTable.$inferSelect;
export type CreditLedgerEntry = typeof creditLedgerTable.$inferSelect;
