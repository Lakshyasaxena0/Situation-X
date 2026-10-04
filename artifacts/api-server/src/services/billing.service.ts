/**
 * Pricing / billing script for Situation X.
 *
 * 1 rupee = 1 credit. The product is a prepaid subscription in four durations at fixed prices
 * (rupees, before any GST): Monthly 150, 6 Months 850, 1 Year 1700, 2 Years 3400. Each plan gives
 * as many credits as rupees paid (150 / 850 / 1700 / 3400), valid while the subscription runs.
 *
 *   subtotal = plan price
 *   gst      = subtotal x GST %                     (0 until the business is GST registered)
 *   total    = subtotal + gst                       <- what Razorpay charges
 *
 * Everything is computed on the server in integer paise; the browser only sends a plan id, so a
 * customer can never choose their own amount. Rates are read from environment variables on every
 * call, so a price change needs a restart, not a code change:
 *
 *   BILLING_PLAN_PRICES_INR     prices for 1,6,12,24 months in rupees   default "150,850,1700,3400"
 *   BILLING_CREDITS_PER_INR     credits given per rupee of plan price   default 1
 *   BILLING_GST_PCT             GST added on top (0 = prices final)     default 0
 *   BILLING_PAYWALL             "on" to charge credits for analyses      default off (free)
 *   BILLING_FREE_USER_IDS       comma list of Clerk user ids that never pay (owner/testing)
 *
 * Credits (an analysis costs credits, see credit-cost.service.ts):
 *   BILLING_WELCOME_CREDITS          one-time credits for a new user      default 20 (0 = none)
 *   BILLING_TOPUP_RATE_INR           price of one credit in a top-up pack default 1 (subscribers only)
 *   BILLING_SINGLE_RATE_INR          price of one credit bought without a subscription (the "single
 *                                    query" rate, deliberately higher so users prefer a plan)   default 2
 */

export const PLAN_IDS = ["monthly", "six_months", "yearly", "two_years"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const PLAN_DEFS: Record<PlanId, { label: string; months: number }> = {
  monthly: { label: "Monthly", months: 1 },
  six_months: { label: "6 Months", months: 6 },
  yearly: { label: "1 Year", months: 12 },
  two_years: { label: "2 Years", months: 24 },
};

const DEFAULT_PLAN_PRICES_INR = [150, 850, 1700, 3400];
const DEFAULT_CREDITS_PER_INR = 1;
const DEFAULT_WELCOME_CREDITS = 20;
const DEFAULT_TOPUP_RATE_INR = 1;
const DEFAULT_SINGLE_RATE_INR = 2;

export const PACK_IDS = ["topup_100", "topup_300", "topup_1000"] as const;
export type PackId = (typeof PACK_IDS)[number];
const PACK_DEFS: Record<PackId, { credits: number; discountPct: number }> = {
  topup_100: { credits: 100, discountPct: 0 },
  topup_300: { credits: 300, discountPct: 0 },
  topup_1000: { credits: 1000, discountPct: 0 },
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

function planPriceInr(index: number): number {
  const raw = process.env.BILLING_PLAN_PRICES_INR?.trim();
  if (raw) {
    const v = Number(raw.split(",")[index]?.trim());
    if (Number.isFinite(v) && v >= 1 && v <= 1_000_000) return v;
  }
  return DEFAULT_PLAN_PRICES_INR[index];
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** Pure given the environment: the full price breakdown for one plan. */
export function quoteFor(planId: PlanId): Quote {
  const def = PLAN_DEFS[planId];
  const monthlyPaise = Math.round(planPriceInr(0) * 100);
  const subtotal = Math.round(planPriceInr(PLAN_IDS.indexOf(planId)) * 100);
  const gstPct = numberFromEnv("BILLING_GST_PCT", 0, 0, 40);

  // "gross" is what the same months would cost at the monthly price; the saving is shown to the user.
  const grossPaise = monthlyPaise * def.months;
  const discountPaise = Math.max(0, grossPaise - subtotal);
  const discountPct = grossPaise > 0 ? Math.round((discountPaise / grossPaise) * 100) : 0;
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
    credits: Math.round((subtotal / 100) * creditsPerInr()),
  };
}

export function creditsPerInr(): number {
  return numberFromEnv("BILLING_CREDITS_PER_INR", DEFAULT_CREDITS_PER_INR, 0.1, 1000);
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
