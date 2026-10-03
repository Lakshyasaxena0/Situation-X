import { Router } from "express";
import { db, analysesTable } from "@workspace/db";
import { and, eq, isNotNull, lte, asc, count } from "drizzle-orm";
import { currentUserId } from "../middlewares/requireUser.js";

const router = Router();

const MAX_DUE = 3;                 // never nag with more than a few at once
const SNOOZE_DAYS = 3;
const SNIPPET_LENGTH = 140;

/** Predictions whose time window has passed and that the user has not answered yet. */
router.get("/analysis/followups/due", async (req, res) => {
  try {
    const where = and(
      eq(analysesTable.userId, currentUserId(res)),
      eq(analysesTable.followUpStatus, "pending"),
      isNotNull(analysesTable.followUpAt),
      lte(analysesTable.followUpAt, new Date()),
    );
    const [items, [{ total }]] = await Promise.all([
      db.select().from(analysesTable).where(where).orderBy(asc(analysesTable.followUpAt)).limit(MAX_DUE),
      db.select({ total: count() }).from(analysesTable).where(where),
    ]);
    res.json({
      items: items.map((a) => ({
        id: a.id,
        situation: a.situation.slice(0, SNIPPET_LENGTH),
        summary: a.summary,
        verdict: a.overallResult,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    req.log.error({ err }, "Follow-up lookup failed");
    res.status(500).json({ error: "followup_failed", message: "Failed to load follow-ups" });
  }
});

function parseId(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

async function updateFollowUp(
  req: import("express").Request,
  res: import("express").Response,
  set: Partial<typeof analysesTable.$inferInsert>,
  message: string,
) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }
  try {
    const [row] = await db
      .update(analysesTable)
      .set(set)
      .where(and(eq(analysesTable.id, id), eq(analysesTable.userId, currentUserId(res))))
      .returning({ id: analysesTable.id });
    if (!row) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }
    res.json({ success: true, message });
  } catch (err) {
    req.log.error({ err }, "Follow-up update failed");
    res.status(500).json({ error: "followup_failed", message });
  }
}

// "Too early to say": ask again in a few days.
router.post("/analysis/history/:id/followup/snooze", (req, res) =>
  updateFollowUp(req, res, { followUpAt: new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000) }, "Will ask again later"),
);

// "Don't ask me about this one."
router.post("/analysis/history/:id/followup/dismiss", (req, res) =>
  updateFollowUp(req, res, { followUpStatus: "dismissed" }, "Follow-up dismissed"),
);

export default router;
