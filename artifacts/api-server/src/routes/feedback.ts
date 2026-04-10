import { Router } from "express";
import { db, analysesTable, feedbackTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

router.post("/feedback", async (req, res) => {
  const { analysisId, rating, accuracy, comment, helpful } = req.body;

  if (!analysisId || !rating) {
    res.status(400).json({ error: "missing_fields", message: "analysisId and rating are required" });
    return;
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "invalid_rating", message: "Rating must be between 1 and 5" });
    return;
  }

  try {
    // Get the analysis to store a snippet
    const [analysis] = await db.select({ situation: analysesTable.situation }).from(analysesTable).where(eq(analysesTable.id, Number(analysisId)));
    const situationSnippet = analysis?.situation?.slice(0, 100) ?? "";

    const [saved] = await db.insert(feedbackTable).values({
      analysisId: Number(analysisId),
      situationSnippet,
      rating: Number(rating),
      accuracy: accuracy ? Number(accuracy) : undefined,
      comment: comment ?? null,
      helpful: helpful !== undefined ? Boolean(helpful) : null,
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
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const analysisId = req.query.analysisId ? Number(req.query.analysisId) : undefined;

  try {
    let query = db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt));

    const [items, [{ total }]] = await Promise.all([
      analysisId
        ? db.select().from(feedbackTable).where(eq(feedbackTable.analysisId, analysisId)).orderBy(desc(feedbackTable.createdAt)).limit(limit).offset(offset)
        : db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt)).limit(limit).offset(offset),
      db.select({ total: count() }).from(feedbackTable),
    ]);

    res.json({
      items: items.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
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
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }

  const [deleted] = await db.delete(feedbackTable).where(eq(feedbackTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Feedback not found" });
    return;
  }

  res.json({ success: true, message: "Feedback deleted" });
});

export default router;
