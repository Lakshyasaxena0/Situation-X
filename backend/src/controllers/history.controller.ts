// backend/src/controllers/history.controller.ts
import { Request, Response } from "express";
import {
  saveFeedback,
  getFeedbackByUser,
} from "../models/history.model";
import { logger } from "../utils/logger";
// -----------------------------
// SUBMIT FEEDBACK
// -----------------------------
export async function submitFeedbackHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { analysisId, rating, comment } = req.body;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const feedback = await saveFeedback(
      userId,
      analysisId,
      rating,
      comment
    );
    logger.info("Feedback submitted", {
      userId,
      analysisId,
      rating,
    });
    res.status(201).json(feedback);
  } catch (error: any) {
    logger.error("Submit feedback failed", { error: error.message });
    res.status(500).json({
      error: "Failed to submit feedback",
    });
  }
}
// -----------------------------
// GET USER FEEDBACK
// -----------------------------
export async function getFeedbackHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const feedbackList = await getFeedbackByUser(userId);
    res.status(200).json(feedbackList);
  } catch (error: any) {
    logger.error("Fetch feedback failed", { error: error.message });
    res.status(500).json({
      error: "Failed to fetch feedback",
    });
  }
}
