import { pgTable, text, serial, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

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
  plan: text("plan").notNull(),
  months: integer("months").notNull(),
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
