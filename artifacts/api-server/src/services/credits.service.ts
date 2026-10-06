import { db, creditWalletsTable, creditLedgerTable } from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { isFreeUser, paywallEnabled, welcomeCredits } from "./billing.service.js";

/**
 * Prepaid credit wallet. Every change goes through here and is recorded in the ledger.
 * Safety properties (all enforced by the database, not by hope):
 *   - the balance cannot go below zero (CHECK constraint + conditional UPDATE);
 *   - a purchase or a refund is applied at most once ((reason, ref) unique index);
 *   - balance and ledger change in the same transaction.
 */

export type LedgerReason = "welcome" | "plan" | "topup" | "single" | "analysis" | "refund";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** Are credits charged for this user right now? (Only once the paywall is on, see paywallEnabled(); never for owner/test accounts.) */
export function billingActiveFor(userId: string): boolean {
  return paywallEnabled() && !isFreeUser(userId);
}

async function insertLedger(
  ex: Executor,
  entry: { userId: string; delta: number; balanceAfter: number; reason: LedgerReason; ref?: string | null; analysisId?: number | null; meta?: unknown },
): Promise<number> {
  const [row] = await ex
    .insert(creditLedgerTable)
    .values({
      userId: entry.userId,
      delta: entry.delta,
      balanceAfter: entry.balanceAfter,
      reason: entry.reason,
      ref: entry.ref ?? null,
      analysisId: entry.analysisId ?? null,
      meta: (entry.meta ?? null) as Record<string, unknown> | null,
    })
    .returning({ id: creditLedgerTable.id });
  return row.id;
}

/** Creates the wallet if needed; a brand-new wallet receives the one-time welcome credits. */
async function ensureWalletIn(tx: Tx, userId: string): Promise<void> {
  const welcome = welcomeCredits();
  const created = await tx
    .insert(creditWalletsTable)
    .values({ userId, balance: welcome })
    .onConflictDoNothing()
    .returning({ balance: creditWalletsTable.balance });
  if (created.length > 0 && welcome > 0) {
    await insertLedger(tx, { userId, delta: welcome, balanceAfter: welcome, reason: "welcome", ref: `welcome:${userId}` });
  }
}

/** Safe to call concurrently: only the call that actually creates the row grants the welcome credits. */
export async function ensureWallet(userId: string): Promise<void> {
  await db.transaction((tx) => ensureWalletIn(tx, userId));
}

export async function getBalance(userId: string): Promise<number> {
  await ensureWallet(userId);
  const [row] = await db.select({ balance: creditWalletsTable.balance }).from(creditWalletsTable).where(eq(creditWalletsTable.userId, userId));
  return row?.balance ?? 0;
}

/**
 * Adds credits (purchase, welcome gift or refund). Idempotent per (reason, ref): a repeat with the
 * same pair changes nothing and returns false. Pass `tx` to join an existing transaction.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: LedgerReason,
  ref: string | null,
  meta?: unknown,
  tx?: Tx,
): Promise<boolean> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Credit amount must be a positive integer");
  const run = async (t: Tx): Promise<boolean> => {
    if (ref !== null) {
      const [dup] = await t
        .select({ id: creditLedgerTable.id })
        .from(creditLedgerTable)
        .where(and(eq(creditLedgerTable.reason, reason), eq(creditLedgerTable.ref, ref)));
      if (dup) return false;
    }
    await ensureWalletIn(t, userId);
    const [wallet] = await t
      .update(creditWalletsTable)
      .set({ balance: sql`${creditWalletsTable.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(creditWalletsTable.userId, userId))
      .returning({ balance: creditWalletsTable.balance });
    await insertLedger(t, { userId, delta: amount, balanceAfter: wallet.balance, reason, ref, meta });
    return true;
  };
  return tx ? run(tx) : db.transaction(run);
}

export type DebitResult =
  | { ok: true; ledgerId: number; balance: number }
  | { ok: false; balance: number };

/** Atomically spends credits. Fails (without changing anything) when the balance is too low. */
export async function debitCredits(userId: string, amount: number, meta?: unknown): Promise<DebitResult> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Credit amount must be a positive integer");
  await ensureWallet(userId);
  return db.transaction(async (tx) => {
    const [wallet] = await tx
      .update(creditWalletsTable)
      .set({ balance: sql`${creditWalletsTable.balance} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(creditWalletsTable.userId, userId), gte(creditWalletsTable.balance, amount)))
      .returning({ balance: creditWalletsTable.balance });
    if (!wallet) {
      const [current] = await tx.select({ balance: creditWalletsTable.balance }).from(creditWalletsTable).where(eq(creditWalletsTable.userId, userId));
      return { ok: false, balance: current?.balance ?? 0 } as const;
    }
    const ledgerId = await insertLedger(tx, { userId, delta: -amount, balanceAfter: wallet.balance, reason: "analysis", meta });
    return { ok: true, ledgerId, balance: wallet.balance } as const;
  });
}

/** Links a charge to the analysis it paid for (known only after the analysis is saved). */
export async function attachAnalysis(ledgerId: number, analysisId: number): Promise<void> {
  await db.update(creditLedgerTable).set({ analysisId }).where(eq(creditLedgerTable.id, ledgerId));
}

/**
 * Gives back part (or all) of a charge, e.g. the AI part when the AI could not answer.
 * Each `part` label is applied at most once per charge, and the refunds together can never exceed
 * the charge itself.
 */
export async function refundCharge(userId: string, ledgerId: number, amount: number, part: string): Promise<boolean> {
  if (amount <= 0) return false;
  return db.transaction(async (tx) => {
    // Serialise refunds of the same charge so two of them cannot both pass the cap check.
    const [charge] = await tx
      .select()
      .from(creditLedgerTable)
      .where(and(eq(creditLedgerTable.id, ledgerId), eq(creditLedgerTable.userId, userId), eq(creditLedgerTable.reason, "analysis")))
      .for("update");
    if (!charge || charge.delta >= 0) return false;
    const [{ refunded }] = await tx
      .select({ refunded: sql<number>`coalesce(sum(${creditLedgerTable.delta}), 0)::int` })
      .from(creditLedgerTable)
      .where(and(eq(creditLedgerTable.reason, "refund"), sql`${creditLedgerTable.ref} like ${`debit:${ledgerId}:%`}`));
    const capped = Math.min(amount, -charge.delta - refunded);
    if (capped <= 0) return false;
    return grantCredits(userId, capped, "refund", `debit:${ledgerId}:${part}`, { why: part, chargeId: ledgerId }, tx);
  });
}

export type LedgerView = {
  id: number;
  delta: number;
  balanceAfter: number;
  reason: LedgerReason;
  analysisId: number | null;
  createdAt: string;
};

export async function recentLedger(userId: string, limit = 25): Promise<LedgerView[]> {
  const rows = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId))
    .orderBy(desc(creditLedgerTable.id))
    .limit(Math.min(100, Math.max(1, limit)));
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    balanceAfter: r.balanceAfter,
    reason: r.reason as LedgerReason,
    analysisId: r.analysisId,
    createdAt: r.createdAt.toISOString(),
  }));
}
