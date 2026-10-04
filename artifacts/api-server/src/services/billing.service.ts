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
 *   BILLING_PAYWALL             "on" to charge credits for analyses     default off (free)
 *   BILLING_FREE_USER_IDS       comma list of Clerk user ids that never pay (owner/testing)
 *
 * Credits (an analysis costs credits, see credit-cost.service.ts):
 *   BILLING_CREDITS_PER_MONTH        credits a plan includes per month    default 150
 *   BILLING_WELCOME_CREDITS          one-time credits for a new user      default 20 (0 = none)
 *   BILLING_TOPUP_RATE_INR           price of one credit in a top-up pack default 1.35 (subscribers only)
 *   BILLING_SINGLE_RATE_INR          price of one credit bought without a subscription (the "single
 *                                    query" rate, deliberately higher)       default 3
 * Top-up packs are cheaper per credit the bigger they are (0%, 5%, 10% off).
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

const DEFAULT_CREDITS_PER_MONTH = 150;
const DEFAULT_WELCOME_CREDITS = 20;
const DEFAULT_TOPUP_RATE_INR = 1.35;
const DEFAULT_SINGLE_RATE_INR = 3;

export const PACK_IDS = ["topup_100", "topup_300", "topup_1000"] as const;
export type PackId = (typeof PACK_IDS)[number];
const PACK_DEFS: Record<PackId, { credits: number; discountPct: number }> = {
  topup_100: { credits: 100, discountPct: 0 },
  topup_300: { credits: 300, discountPct: 5 },
  topup_1000: { credits: 1000, discountPct: 10 },
};
export const SINGLE_MIN_CREDITS = 10;
export const SINGLE_MAX_CREDITS = 100;

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
  /** Credits added to the wallet when this plan is paid. */
  credits: number;
};

/** A credit-only purchase: a top-up pack (subscribers) or a single-query purchase (anyone). */
export type CreditQuote = {
  kind: "topup" | "single";
  packId: PackId | null;
  credits: number;
  currency: "INR";
  grossPaise: number;
  discountPct: number;
  discountPaise: number;
  gstPct: number;
  gstPaise: number;
  totalPaise: number;
  perCreditPaise: number;
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
    credits: creditsPerMonth() * def.months,
  };
}

export function creditsPerMonth(): number {
  return Math.round(numberFromEnv("BILLING_CREDITS_PER_MONTH", DEFAULT_CREDITS_PER_MONTH, 1, 100_000));
}

export function welcomeCredits(): number {
  return Math.round(numberFromEnv("BILLING_WELCOME_CREDITS", DEFAULT_WELCOME_CREDITS, 0, 10_000));
}

function creditQuote(kind: "topup" | "single", packId: PackId | null, credits: number, ratePaise: number, discountPct: number): CreditQuote {
  const gstPct = numberFromEnv("BILLING_GST_PCT", 0, 0, 40);
  const grossPaise = Math.round(credits * ratePaise);
  const discountPaise = Math.round((grossPaise * discountPct) / 100);
  const subtotal = grossPaise - discountPaise;
  const gstPaise = Math.round((subtotal * gstPct) / 100);
  const totalPaise = subtotal + gstPaise;
  return {
    kind, packId, credits, currency: "INR", grossPaise, discountPct, discountPaise, gstPct, gstPaise, totalPaise,
    perCreditPaise: Math.round(totalPaise / credits),
  };
}

export function isPackId(value: unknown): value is PackId {
  return typeof value === "string" && (PACK_IDS as readonly string[]).includes(value);
}

export function topupQuote(packId: PackId): CreditQuote {
  const rate = Math.round(numberFromEnv("BILLING_TOPUP_RATE_INR", DEFAULT_TOPUP_RATE_INR, 0.01, 1000) * 100);
  const def = PACK_DEFS[packId];
  return creditQuote("topup", packId, def.credits, rate, def.discountPct);
}

export function allTopupQuotes(): CreditQuote[] {
  return PACK_IDS.map(topupQuote);
}

/** Credits bought without a subscription, at the (higher) single-query rate. */
export function singleQuote(credits: number): CreditQuote {
  const rate = Math.round(numberFromEnv("BILLING_SINGLE_RATE_INR", DEFAULT_SINGLE_RATE_INR, 0.01, 1000) * 100);
  return creditQuote("single", null, credits, rate, 0);
}

export function isValidSingleCredits(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= SINGLE_MIN_CREDITS && value <= SINGLE_MAX_CREDITS;
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
