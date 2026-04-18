import { Request, Response } from "express";
import { runEngine } from "../services/engine.service";
import {
  saveAnalysis,
  getAnalysisByUser,
  getAnalysisById,
  deleteAnalysis,
} from "../models/query.model";
import { cache } from "../utils/cache";
import { logger } from "../utils/logger";

// -----------------------------
// ANALYZE HANDLER
// -----------------------------
export async function analyzeHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const input: string = req.body.input;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // CACHE CHECK
    const cacheKey = `analyze:${input}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info("Cache hit for analyze", { userId });
      res.status(200).json(cached);
      return;
    }

    // RUN ENGINE (async — must await)
    const engineResponse = await runEngine(input);

    // SAVE TO DB
    await saveAnalysis(userId, input, engineResponse);

    // CACHE (5 min TTL)
    cache.set(cacheKey, engineResponse, 300);

    logger.info("Analysis completed", { userId });
    res.status(200).json(engineResponse);
  } catch (error: any) {
    logger.error("Analyze failed", { error: error.message });
    res.status(500).json({ error: "Failed to process analysis" });
  }
}

// -----------------------------
// GET HISTORY (PAGINATED)
// -----------------------------
export async function getHistoryHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await getAnalysisByUser(userId, page, limit);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error("Fetch history failed", { error: error.message });
    res.status(500).json({ error: "Failed to fetch history" });
  }
}

// -----------------------------
// GET SINGLE ANALYSIS
// -----------------------------
export async function getSingleHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const record = await getAnalysisById(id, userId);
    if (!record) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    res.status(200).json(record);
  } catch (error: any) {
    logger.error("Fetch analysis failed", { error: error.message });
    res.status(500).json({ error: "Failed to fetch analysis" });
  }
}

// -----------------------------
// DELETE ANALYSIS
// -----------------------------
export async function deleteHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const success = await deleteAnalysis(id, userId);
    if (!success) {
      res.status(404).json({ error: "Analysis not found or not allowed" });
      return;
    }

    logger.info("Analysis deleted", { userId, id });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error: any) {
    logger.error("Delete analysis failed", { error: error.message });
    res.status(500).json({ error: "Failed to delete analysis" });
  }
}
