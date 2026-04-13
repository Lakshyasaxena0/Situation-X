// backend/src/controllers/profile.controller.ts
import { Request, Response } from "express";
import { supabase } from "../config/db";
import { logger } from "../utils/logger";
// -----------------------------
// GET PROFILE
// -----------------------------
export async function getProfileHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, created_at")
      .eq("id", userId)
      .single();
    if (error || !data) {
      throw new Error(error?.message || "User not found");
    }
    res.status(200).json(data);
  } catch (error: any) {
    logger.error("Fetch profile failed", { error: error.message });
    res.status(500).json({
      error: "Failed to fetch profile",
    });
  }
}
// -----------------------------
// UPDATE PROFILE
// -----------------------------
export async function updateProfileHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { name } = req.body;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({
        error: "Name must be a non-empty string",
      });
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", userId)
      .select("id, email, name, created_at")
      .single();
    if (error || !data) {
      throw new Error(error?.message || "Update failed");
    }
    logger.info("Profile updated", { userId });
    res.status(200).json(data);
  } catch (error: any) {
    logger.error("Update profile failed", { error: error.message });
    res.status(500).json({
      error: "Failed to update profile",
    });
  }
}
