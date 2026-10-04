/**
 * Pricing / billing script for Situation X.
 *
 * The product is a prepaid subscription in four durations. The price of a duration is:
 *
 *   gross    = monthly price x months
 *   discount = gross x duration discount %          (longer plans are cheaper per month)
 *   subtotal = gross - discount
 *   gst      = subtotal x GST %                     (0 until the business is GST registered)
 *   total    = subtotal + gst                       <- what Razorpay charges
 *
 * Everything is computed on the server in integer paise; the browser only sends a plan id, so a
 * customer can never choose their own amount. Rates are read from environment variables on every
 * call, so a price change needs a restart, not a code change:
 *
 *   BILLING_MONTHLY_PRICE_INR   price of one month in rupees          default 199
 *   BILLING_DISCOUNT_PCT        discounts for 1,6,12,24 months         default "0,10,20,30"
 *   BILLING_GST_PCT             GST added on top (0 = prices final)    default 0
 *   BILLING_PAYWALL             "on" to require a subscription         default off
 *   BILLING_FREE_USER_IDS       comma list of Clerk user ids that never need to pay (owner/testing)
 */

export const PLAN_IDS = ["monthly", "six_months", "yearly", "two_years"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const PLAN_DEFS: Record<PlanId, { label: string; months: number }> = {
  monthly: { label: "Monthly", months: 1 },
  six_months: { label: "6 Months", months: 6 },
  yearly: { label: "1 Year", months: 12 },
  two_years: { label: "2 Years", months: 24 },
};

const DEFAULT_MONTHLY_PRICE_INR = 199;
const DEFAULT_DISCOUNTS = [0, 10, 20, 30];

export type Quote = {
  planId: PlanId;
  label: string;
  months: number;
  currency: "INR";
  monthlyPaise: number;
  grossPaise: number;
  discountPct: number;
  discountPaise: number;
  gstPct: number;
  gstPaise: number;
  totalPaise: number;
  effectivePerMonthPaise: number;
};

function numberFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

function discountFor(index: number): number {
  const raw = process.env.BILLING_DISCOUNT_PCT?.trim();
  if (!raw) return DEFAULT_DISCOUNTS[index];
  const parts = raw.split(",").map((s) => Number(s.trim()));
  const v = parts[index];
  return Number.isFinite(v) && v >= 0 && v <= 90 ? v : DEFAULT_DISCOUNTS[index];
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** Pure given the environment: the full price breakdown for one plan. */
export function quoteFor(planId: PlanId): Quote {
  const def = PLAN_DEFS[planId];
  const monthlyPaise = Math.round(numberFromEnv("BILLING_MONTHLY_PRICE_INR", DEFAULT_MONTHLY_PRICE_INR, 1, 100_000) * 100);
  const discountPct = discountFor(PLAN_IDS.indexOf(planId));
  const gstPct = numberFromEnv("BILLING_GST_PCT", 0, 0, 40);

  const grossPaise = monthlyPaise * def.months;
  const discountPaise = Math.round((grossPaise * discountPct) / 100);
  const subtotal = grossPaise - discountPaise;
  const gstPaise = Math.round((subtotal * gstPct) / 100);
  const totalPaise = subtotal + gstPaise;

  return {
    planId,
    label: def.label,
    months: def.months,
    currency: "INR",
    monthlyPaise,
    grossPaise,
    discountPct,
    discountPaise,
    gstPct,
    gstPaise,
    totalPaise,
    effectivePerMonthPaise: Math.round(totalPaise / def.months),
  };
}

export function allQuotes(): Quote[] {
  return PLAN_IDS.map(quoteFor);
}

export function paywallEnabled(): boolean {
  return process.env.BILLING_PAYWALL?.trim().toLowerCase() === "on";
}

export function isFreeUser(userId: string): boolean {
  const list = (process.env.BILLING_FREE_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(userId);
}
