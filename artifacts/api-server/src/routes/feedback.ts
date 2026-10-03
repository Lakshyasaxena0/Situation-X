import { Router } from "express";
import { db, analysesTable, feedbackTable } from "@workspace/db";
import { and, eq, desc, count } from "drizzle-orm";
import { CreateFeedbackBody, GetFeedbackListQueryParams } from "@workspace/api-zod";
import { currentUserId } from "../middlewares/requireUser.js";

const router = Router();

const MAX_COMMENT_LENGTH = 2000;
const MAX_PAGE_SIZE = 100;

function parseId(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

router.post("/feedback", async (req, res) => {
  const parsed = CreateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { analysisId, rating, accuracy, comment, helpful } = parsed.data;

  // The generated schema allows any number within 1-5; the DB columns are integers.
  if (!Number.isInteger(analysisId) || analysisId < 1) {
    res.status(400).json({ error: "invalid_analysis_id", message: "analysisId must be a positive integer" });
    return;
  }
  if (!Number.isInteger(rating) || (accuracy !== undefined && !Number.isInteger(accuracy))) {
    res.status(400).json({ error: "invalid_rating", message: "rating and accuracy must be whole numbers between 1 and 5" });
    return;
  }
  if (comment !== undefined && comment.length > MAX_COMMENT_LENGTH) {
    res.status(400).json({ error: "comment_too_long", message: `Comment must be at most ${MAX_COMMENT_LENGTH} characters` });
    return;
  }

  try {
    // The analysis must exist and belong to the caller; also used to store a snippet.
    const userId = currentUserId(res);
    const [analysis] = await db
      .select({ situation: analysesTable.situation })
      .from(analysesTable)
      .where(and(eq(analysesTable.id, analysisId), eq(analysesTable.userId, userId)));
    if (!analysis) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    const [saved] = await db.insert(feedbackTable).values({
      userId,
      analysisId,
      situationSnippet: analysis.situation.slice(0, 100),
      rating,
      accuracy: accuracy ?? null,
      comment: comment ?? null,
      helpful: helpful ?? null,
    }).returning();

    res.json({
      id: saved.id,
      analysisId: saved.analysisId,
      situationSnippet: saved.situationSnippet,
      rating: saved.rating,
      accuracy: saved.accuracy,
      comment: saved.comment,
      helpful: saved.helpful,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Feedback creation failed");
    res.status(500).json({ error: "feedback_failed", message: "Failed to save feedback" });
  }
});

router.get("/feedback", async (req, res) => {
  const parsedQuery = GetFeedbackListQueryParams.safeParse(req.query);
  const rawLimit = parsedQuery.success ? parsedQuery.data.limit : 20;
  const rawOffset = parsedQuery.success ? parsedQuery.data.offset : 0;
  // Unbounded / negative values would otherwise reach SQL LIMIT/OFFSET.
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawLimit)));
  const offset = Math.max(0, Math.floor(rawOffset));
  const analysisId = req.query.analysisId !== undefined ? parseId(req.query.analysisId) : undefined;
  if (req.query.analysisId !== undefined && analysisId === null) {
    res.status(400).json({ error: "invalid_analysis_id", message: "analysisId must be a positive integer" });
    return;
  }

  try {
    const where = and(
      eq(feedbackTable.userId, currentUserId(res)),
      analysisId ? eq(feedbackTable.analysisId, analysisId) : undefined,
    );

    const [items, [{ total }]] = await Promise.all([
      db.select().from(feedbackTable).where(where).orderBy(desc(feedbackTable.createdAt)).limit(limit).offset(offset),
      // The total must respect the same filter as the page of items.
      db.select({ total: count() }).from(feedbackTable).where(where),
    ]);

    res.json({
      items: items.map(({ userId: _owner, ...f }) => ({ ...f, createdAt: f.createdAt.toISOString() })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error({ err }, "Feedback fetch failed");
    res.status(500).json({ error: "fetch_failed", message: "Failed to fetch feedback" });
  }
});

router.delete("/feedback/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(feedbackTable)
      .where(and(eq(feedbackTable.id, id), eq(feedbackTable.userId, currentUserId(res))))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Feedback not found" });
      return;
    }

    res.json({ success: true, message: "Feedback deleted" });
  } catch (err) {
    req.log.error({ err }, "Feedback delete failed");
    res.status(500).json({ error: "delete_failed", message: "Failed to delete feedback" });
  }
});

export default router;
