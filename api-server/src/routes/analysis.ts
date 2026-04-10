import { Router } from "express";
import { db, analysesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, desc, count } from "drizzle-orm";
import {
  AnalyzeSituationBody,
  GetAnalysisHistoryQueryParams,
  GetAnalysisByIdParams,
  DeleteAnalysisParams,
} from "@workspace/api-zod";
import { runEngine } from "../services/engine.service.js";

const router = Router();

router.post("/analysis/analyze", async (req, res) => {
  const parseResult = AnalyzeSituationBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: parseResult.error.message });
    return;
  }

  const { situation, birthDate, birthTime, latitude, longitude } = parseResult.data as {
    situation: string;
    birthDate?: string;
    birthTime?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!situation || situation.length < 10) {
    res.status(400).json({ error: "too_short", message: "Situation must be at least 10 characters." });
    return;
  }

  try {
    // Step 1: Run the local engine pipeline (AJIT → MANU → Ethical Filter → ASTRO → SIVI)
    const engineResult = runEngine(situation, birthDate, birthTime, latitude, longitude);

    // Step 2: Generate AI-powered summary using OpenAI
    const aiSummaryPrompt = `You are Situation X — an analytical AI with Vedic astrology and psychological insight.

Situation: "${situation}"
Intent detected: ${engineResult.intent.intent} (confidence: ${engineResult.intent.confidence})
Emotion detected: ${engineResult.emotion.emotion} (intensity: ${engineResult.emotion.intensity})
Dominant planet: ${engineResult.astro.influence.dominantPlanet} (signal: ${engineResult.astro.influence.signal})
Best recommended path: ${engineResult.finalVerdict.recommendedAction}
Risk level: ${engineResult.finalVerdict.riskLevel}

Write a concise 2-3 sentence analytical summary that ties all these findings together. Be direct, insightful, and practical. No cosmic fluff.`;

    let summary = engineResult.finalVerdict.reasoning;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 256,
        messages: [{ role: "user", content: aiSummaryPrompt }],
      });
      summary = completion.choices[0]?.message?.content || summary;
    } catch (aiErr) {
      req.log.warn({ aiErr }, "AI summary failed, using engine reasoning");
    }

    // Step 3: Calculate overall score (0-100)
    const riskScore = engineResult.finalVerdict.riskLevel === "low" ? 80 : engineResult.finalVerdict.riskLevel === "medium" ? 55 : 30;
    const emotionBonus = engineResult.emotion.emotion === "calm" ? 10 : engineResult.emotion.emotion === "confused" ? -5 : 0;
    const overallScore = Math.min(100, Math.max(0, riskScore + emotionBonus));

    const fullAnalysis = {
      situation,
      intent: engineResult.intent,
      emotion: engineResult.emotion,
      simulation: engineResult.simulation,
      finalVerdict: engineResult.finalVerdict,
      astro: engineResult.astro,
      overallScore,
      summary,
    };

    const [saved] = await db.insert(analysesTable).values({
      situation,
      category: engineResult.intent.intent,
      modules: ["AJIT", "MANU", "SIVI", "ASTRO"],
      overallResult: engineResult.finalVerdict.riskLevel === "low" ? "YES" : engineResult.finalVerdict.riskLevel === "medium" ? "CONDITIONAL" : "NO",
      overallConfidence: engineResult.intent.confidence,
      overallScore,
      summary,
      fullAnalysis: fullAnalysis as unknown as Record<string, unknown>,
    }).returning();

    res.json({ ...fullAnalysis, id: saved.id, createdAt: saved.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: "analysis_failed", message: "Failed to analyze situation" });
  }
});

router.get("/analysis/history", async (req, res) => {
  const parseResult = GetAnalysisHistoryQueryParams.safeParse(req.query);
  const limit = parseResult.success ? (parseResult.data.limit ?? 20) : 20;
  const offset = parseResult.success ? (parseResult.data.offset ?? 0) : 0;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(analysesTable).orderBy(desc(analysesTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(analysesTable),
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

  const [item] = await db.select().from(analysesTable).where(eq(analysesTable.id, parseResult.data.id));
  if (!item) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/analysis/history/:id", async (req, res) => {
  const parseResult = DeleteAnalysisParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    res.status(400).json({ error: "invalid_id", message: "Invalid ID" });
    return;
  }

  const [deleted] = await db.delete(analysesTable).where(eq(analysesTable.id, parseResult.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  res.json({ success: true, message: "Analysis deleted" });
});

export default router;
