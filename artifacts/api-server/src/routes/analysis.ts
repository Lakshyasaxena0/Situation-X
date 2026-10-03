import { Router } from "express";
import { db, analysesTable } from "@workspace/db";
import { and, eq, desc, count } from "drizzle-orm";
import {
  AnalyzeSituationBody,
  GetAnalysisHistoryQueryParams,
  GetAnalysisByIdParams,
  DeleteAnalysisParams,
} from "@workspace/api-zod";
import { runEngine } from "../services/engine.service.js";
import { currentUserId } from "../middlewares/requireUser.js";
import { getCalibration } from "../services/calibration.service.js";
import { synthesize } from "../services/synthesis.service.js";

const MAX_SITUATION_LENGTH = 2000; // matches the UI textarea limit
const MAX_PAGE_SIZE = 100;

const router = Router();

router.post("/analysis/analyze", async (req, res) => {
  const parseResult = AnalyzeSituationBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: parseResult.error.message });
    return;
  }

  const { latitude, longitude } = parseResult.data;
  const situation = parseResult.data.situation.trim();

  if (situation.length < 10) {
    res.status(400).json({ error: "too_short", message: "Situation must be at least 10 characters." });
    return;
  }
  if (situation.length > MAX_SITUATION_LENGTH) {
    res.status(400).json({ error: "too_long", message: `Situation must be at most ${MAX_SITUATION_LENGTH} characters.` });
    return;
  }

  // The Prashna chart is cast for the moment of the question, so no birth data is needed.
  // Location is optional (default New Delhi) and only refines the ascendant.
  if ((latitude === undefined) !== (longitude === undefined)) {
    res.status(400).json({ error: "invalid_location", message: "Provide both latitude and longitude, or neither." });
    return;
  }
  if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    res.status(400).json({ error: "invalid_location", message: "latitude must be between -90 and 90." });
    return;
  }
  if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    res.status(400).json({ error: "invalid_location", message: "longitude must be between -180 and 180." });
    return;
  }

  try {
    // Step 1: Run the local engine pipeline (AJIT → MANU → Ethical Filter → ASTRO → SIVI)
    const engineResult = runEngine(situation, latitude, longitude);

    // Step 2: AI and astrology work together on the final answer. The AI sees every module's
    // output plus the dasha/transits, and past follow-up accuracy tempers the result.
    const calibration = await getCalibration(engineResult.intent.intent);
    const synthesis = await synthesize(situation, engineResult, calibration);
    const summary = synthesis.summary;
    const overallScore = synthesis.score;

    const fullAnalysis = {
      situation,
      intent: engineResult.intent,
      emotion: engineResult.emotion,
      simulation: engineResult.simulation,
      finalVerdict: engineResult.finalVerdict,
      astro: engineResult.astro,
      overallScore,
      summary,
      synthesis,
    };
    // Ask the user how it turned out once the predicted window has passed.
    const followUpAt = new Date(Date.now() + synthesis.timeframeDays * 24 * 60 * 60 * 1000);

    const [saved] = await db.insert(analysesTable).values({
      userId: currentUserId(res),
      situation,
      category: engineResult.intent.intent,
      modules: ["AJIT", "MANU", "SIVI", "ASTRO"],
      overallResult: synthesis.verdict,
      overallConfidence: synthesis.confidence,
      overallScore,
      summary,
      fullAnalysis: fullAnalysis as unknown as Record<string, unknown>,
      followUpAt,
    }).returning();

    res.json({ ...fullAnalysis, id: saved.id, followUpAt: followUpAt.toISOString(), createdAt: saved.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: "analysis_failed", message: "Failed to analyze situation" });
  }
});

router.get("/analysis/history", async (req, res) => {
  const parseResult = GetAnalysisHistoryQueryParams.safeParse(req.query);
  // Clamp: unbounded or negative values would otherwise reach SQL LIMIT/OFFSET.
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(parseResult.success ? (parseResult.data.limit ?? 20) : 20)));
  const offset = Math.max(0, Math.floor(parseResult.success ? (parseResult.data.offset ?? 0) : 0));

  const owner = eq(analysesTable.userId, currentUserId(res));
  const [items, [{ total }]] = await Promise.all([
    db.select().from(analysesTable).where(owner).orderBy(desc(analysesTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(analysesTable).where(owner),
  ]);

  res.json({
    items: items.map((item) => ({
      id: item.id,
      situation: item.situation,
      intent: (item.fullAnalysis as Record<string, unknown> | null)?.["intent"] ?? { intent: item.category, confidence: item.overallConfidence, score: 0 },
      emotion: (item.fullAnalysis as Record<string, unknown> | null)?.["emotion"] ?? { emotion: "calm", intensity: "low", score: 0 },
      overallScore: item.overallScore,
      riskLevel: item.overallResult === "YES" ? "low" : item.overallResult === "NO" ? "high" : "medium",
      summary: item.summary,
      fullAnalysis: item.fullAnalysis,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  });
});

router.get("/analysis/history/:id", async (req, res) => {
  const parseResult = GetAnalysisByIdParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }

  const [item] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, parseResult.data.id), eq(analysesTable.userId, currentUserId(res))));
  if (!item) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  const { userId: _owner, ...publicItem } = item;
  res.json({ ...publicItem, createdAt: item.createdAt.toISOString() });
});

router.delete("/analysis/history/:id", async (req, res) => {
  const parseResult = DeleteAnalysisParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }

  const [deleted] = await db
    .delete(analysesTable)
    .where(and(eq(analysesTable.id, parseResult.data.id), eq(analysesTable.userId, currentUserId(res))))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  res.json({ success: true, message: "Analysis deleted" });
});

export default router;
