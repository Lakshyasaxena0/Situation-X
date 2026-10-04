import { randomInt } from "node:crypto";
import { db, referralCodesTable, referralsTable, referralRewardsTable, paymentsTable } from "@workspace/db";
import { and, count, eq, inArray, lt, or } from "drizzle-orm";

/**
 * Invite a friend.
 *
 *   1. Every user has a code (and a share link built from it).
 *   2. A new user applies a friend's code once, before paying anything.
 *   3. When that friend makes their first qualifying payment, the person who invited them earns a
 *      discount (REFERRAL_REWARD_PCT) on their next purchase. One friend earns at most one discount
 *      (unique index), and one discount is used per order.
 *
 * Settings (environment variables):
 *   REFERRAL_REWARD_PCT          discount earned per paying friend, 1-50        default 20
 *   REFERRAL_MIN_PAYMENT_INR     smallest first payment that earns the reward   default 100
 *                                (stops a throw-away second account from farming discounts)
 */

const DEFAULT_REWARD_PCT = 20;
const DEFAULT_MIN_PAYMENT_INR = 100;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: easy to read out and type
const CODE_LENGTH = 8;
/** An unpaid order holds a discount for this long, then the discount becomes usable again. */
const RESERVATION_HOURS = 2;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function numberFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

export function rewardPct(): number {
  return Math.round(numberFromEnv("REFERRAL_REWARD_PCT", DEFAULT_REWARD_PCT, 1, 50));
}

export function minQualifyingPaise(): number {
  return Math.round(numberFromEnv("REFERRAL_MIN_PAYMENT_INR", DEFAULT_MIN_PAYMENT_INR, 0, 100_000) * 100);
}

/** Codes are typed by people: ignore case, spaces and dashes. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** The user's code, created on first use. Safe to call concurrently. */
export async function getOrCreateCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db.select({ code: referralCodesTable.code }).from(referralCodesTable).where(eq(referralCodesTable.userId, userId));
    if (existing) return existing.code;
    // A clash on the code (or a concurrent insert for the same user) simply retries.
    await db.insert(referralCodesTable).values({ userId, code: randomCode() }).onConflictDoNothing();
  }
  throw new Error("Could not create a referral code");
}

export type RedeemResult =
  | { ok: true; referrerId: string }
  | { ok: false; reason: "invalid_code" | "own_code" | "already_referred" | "already_paid" };

/** A new user applies a friend's code. Only possible once, and only before their first payment. */
export async function redeemCode(refereeId: string, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) return { ok: false, reason: "invalid_code" };

  const [owner] = await db.select({ userId: referralCodesTable.userId }).from(referralCodesTable).where(eq(referralCodesTable.code, code));
  if (!owner) return { ok: false, reason: "invalid_code" };
  if (owner.userId === refereeId) return { ok: false, reason: "own_code" };

  const [{ paid }] = await db
    .select({ paid: count() })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.userId, refereeId), eq(paymentsTable.status, "paid")));
  if (paid > 0) return { ok: false, reason: "already_paid" };

  const inserted = await db
    .insert(referralsTable)
    .values({ referrerId: owner.userId, refereeId, code })
    .onConflictDoNothing()
    .returning({ id: referralsTable.id });
  if (inserted.length === 0) return { ok: false, reason: "already_referred" };
  return { ok: true, referrerId: owner.userId };
}

/**
 * Called inside the transaction that marks a payment as paid. If this person was invited and this
 * is their first qualifying payment, the inviter earns a discount. Idempotent: the unique index on
 * referralId means a repeated or concurrent call cannot create a second discount.
 */
export async function rewardReferrerForPayment(tx: Tx, payment: { userId: string; orderId: string; amountPaise: number }): Promise<boolean> {
  if (payment.amountPaise < minQualifyingPaise()) return false;
  const [referral] = await tx.select().from(referralsTable).where(eq(referralsTable.refereeId, payment.userId));
  if (!referral) return false;
  const inserted = await tx
    .insert(referralRewardsTable)
    .values({ userId: referral.referrerId, referralId: referral.id, discountPct: rewardPct() })
    .onConflictDoNothing()
    .returning({ id: referralRewardsTable.id });
  return inserted.length > 0;
}

export type ReservedReward = { id: number; discountPct: number };

/**
 * Takes the oldest usable discount for an order that is about to be created, so that two orders
 * started at the same moment cannot both get it. Release it if the order cannot be created,
 * attach the real order id once it exists.
 */
export async function reserveReward(userId: string): Promise<ReservedReward | null> {
  return db.transaction(async (tx) => {
    const staleBefore = new Date(Date.now() - RESERVATION_HOURS * 3_600_000);
    const [candidate] = await tx
      .select()
      .from(referralRewardsTable)
      .where(
        and(
          eq(referralRewardsTable.userId, userId),
          or(
            eq(referralRewardsTable.status, "available"),
            and(eq(referralRewardsTable.status, "reserved"), lt(referralRewardsTable.reservedAt, staleBefore)),
          ),
        ),
      )
      .orderBy(referralRewardsTable.id)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!candidate) return null;
    await tx
      .update(referralRewardsTable)
      .set({ status: "reserved", orderId: null, reservedAt: new Date() })
      .where(eq(referralRewardsTable.id, candidate.id));
    return { id: candidate.id, discountPct: candidate.discountPct };
  });
}

export async function attachRewardToOrder(rewardId: number, orderId: string): Promise<void> {
  await db.update(referralRewardsTable).set({ orderId }).where(and(eq(referralRewardsTable.id, rewardId), eq(referralRewardsTable.status, "reserved")));
}

export async function releaseReward(rewardId: number): Promise<void> {
  await db
    .update(referralRewardsTable)
    .set({ status: "available", orderId: null, reservedAt: null })
    .where(and(eq(referralRewardsTable.id, rewardId), eq(referralRewardsTable.status, "reserved")));
}

/** Called when an order is paid: the discount it carried is now spent. */
export async function markRewardUsed(tx: Tx, orderId: string): Promise<void> {
  await tx
    .update(referralRewardsTable)
    .set({ status: "used", usedAt: new Date() })
    .where(and(eq(referralRewardsTable.orderId, orderId), inArray(referralRewardsTable.status, ["reserved", "available"])));
}

/** Discount in paise for an amount, rounded to the nearest paisa. */
export function discountPaiseFor(amountPaise: number, pct: number): number {
  return Math.round((amountPaise * pct) / 100);
}

export type ReferralSummary = {
  code: string;
  rewardPct: number;
  minPaymentPaise: number;
  invited: number;          // friends who applied the code
  converted: number;        // friends who paid (discounts earned)
  discountsAvailable: number;
  nextDiscountPct: number;  // 0 when none is waiting
  referredBy: boolean;      // this user already applied someone's code
};

export async function summaryFor(userId: string): Promise<ReferralSummary> {
  const code = await getOrCreateCode(userId);
  const staleBefore = new Date(Date.now() - RESERVATION_HOURS * 3_600_000);
  const [[{ invited }], [{ converted }], available, [referredRow]] = await Promise.all([
    db.select({ invited: count() }).from(referralsTable).where(eq(referralsTable.referrerId, userId)),
    db.select({ converted: count() }).from(referralRewardsTable).where(eq(referralRewardsTable.userId, userId)),
    db
      .select({ discountPct: referralRewardsTable.discountPct })
      .from(referralRewardsTable)
      .where(
        and(
          eq(referralRewardsTable.userId, userId),
          or(
            eq(referralRewardsTable.status, "available"),
            and(eq(referralRewardsTable.status, "reserved"), lt(referralRewardsTable.reservedAt, staleBefore)),
          ),
        ),
      )
      .orderBy(referralRewardsTable.id),
    db.select({ id: referralsTable.id }).from(referralsTable).where(eq(referralsTable.refereeId, userId)),
  ]);
  return {
    code,
    rewardPct: rewardPct(),
    minPaymentPaise: minQualifyingPaise(),
    invited,
    converted,
    discountsAvailable: available.length,
    nextDiscountPct: available[0]?.discountPct ?? 0,
    referredBy: Boolean(referredRow),
  };
}
