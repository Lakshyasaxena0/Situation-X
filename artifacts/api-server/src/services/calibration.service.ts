import { db, feedbackTable, analysesTable } from "@workspace/db";
import { eq, isNotNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

/**
 * Learning loop: users are asked, after a prediction's time window has passed,
 * whether things turned out the way the reading suggested (feedback.outcome).
 * Those answers are aggregated per question category (the AJIT intent) and fed
 * back into the next analyses in two ways:
 *   1. the score is pulled toward neutral when past readings of that kind were
 *      often wrong (and nudged up, slightly, when they were reliably right);
 *   2. the AI is told the historical hit rate so it can word its confidence honestly.
 * Only aggregate counts are used; no individual user's data leaves their account.
 */

export type Calibration = {
  samples: number;   // number of follow-up answers behind the figure
  hitRate: number;   // smoothed share of readings that matched (0-1)
  applied: boolean;  // false while there is too little data to adjust anything
};

export type CalibrationCounts = { matched: number; partly: number; different: number };

const PRIOR_RATE = 0.6;     // assumed accuracy before any data exists
const PRIOR_WEIGHT = 10;    // how many "virtual" answers the prior is worth
const MIN_SAMPLES = 5;      // below this, report the figure but do not adjust scores
const MIN_FACTOR = 0.7;
const MAX_FACTOR = 1.1;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const NO_CALIBRATION: Calibration = { samples: 0, hitRate: PRIOR_RATE, applied: false };

/** Pure: turns raw outcome counts into a calibration. */
export function calibrationFromCounts(c: CalibrationCounts): Calibration {
  const samples = c.matched + c.partly + c.different;
  const hits = c.matched + 0.5 * c.partly;
  const smoothed = (hits + PRIOR_RATE * PRIOR_WEIGHT) / (samples + PRIOR_WEIGHT);
  return { samples, hitRate: Math.round(smoothed * 100) / 100, applied: samples >= MIN_SAMPLES };
}

/** Multiplier applied to the score's distance from 50. 1 = no change. */
export function calibrationFactor(cal: Calibration): number {
  if (!cal.applied) return 1;
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, cal.hitRate / PRIOR_RATE));
}

/** Pure: shrinks (or slightly widens) a 0-100 score around 50. */
export function applyCalibration(score: number, cal: Calibration): number {
  const adjusted = 50 + (score - 50) * calibrationFactor(cal);
  return Math.min(100, Math.max(0, Math.round(adjusted)));
}

let cache: { at: number; byCategory: Map<string, CalibrationCounts> } | null = null;

export function invalidateCalibrationCache(): void {
  cache = null;
}

async function loadCounts(): Promise<Map<string, CalibrationCounts>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.byCategory;

  const rows = await db
    .select({
      category: analysesTable.category,
      outcome: feedbackTable.outcome,
      n: sql<number>`count(*)::int`,
    })
    .from(feedbackTable)
    .innerJoin(analysesTable, eq(analysesTable.id, feedbackTable.analysisId))
    .where(isNotNull(feedbackTable.outcome))
    .groupBy(analysesTable.category, feedbackTable.outcome);

  const byCategory = new Map<string, CalibrationCounts>();
  for (const r of rows) {
    const entry = byCategory.get(r.category) ?? { matched: 0, partly: 0, different: 0 };
    if (r.outcome === "matched") entry.matched += r.n;
    else if (r.outcome === "partly") entry.partly += r.n;
    else if (r.outcome === "different") entry.different += r.n;
    byCategory.set(r.category, entry);
  }
  cache = { at: Date.now(), byCategory };
  return byCategory;
}

/** Calibration for one question category. Never throws: a DB hiccup means "no adjustment". */
export async function getCalibration(category: string): Promise<Calibration> {
  try {
    const counts = (await loadCounts()).get(category);
    return counts ? calibrationFromCounts(counts) : NO_CALIBRATION;
  } catch (err) {
    logger.warn({ err }, "Calibration lookup failed; continuing without adjustment");
    return NO_CALIBRATION;
  }
}
