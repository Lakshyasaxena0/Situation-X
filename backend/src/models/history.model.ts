// backend/src/models/history.model.ts
import { supabase } from "../config/db";
import { FeedbackRecord } from "../../../shared/types/result.types";
// -----------------------------
// SAVE FEEDBACK
// -----------------------------
export async function saveFeedback(
  userId: string,
  analysisId: string,
  rating: number,
  comment?: string
): Promise<FeedbackRecord> {
  const payload = {
    user_id: userId,
    analysis_id: analysisId,
    rating,
    comment: comment ?? null,
  };
  const { data, error } = await supabase
    .from("feedback")
    .insert([payload])
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to save feedback: ${error?.message}`);
  }
  return data as FeedbackRecord;
}
// -----------------------------
// GET FEEDBACK BY USER
// -----------------------------
export async function getFeedbackByUser(
  userId: string
): Promise<FeedbackRecord[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch feedback: ${error.message}`);
  }
  return (data ?? []) as FeedbackRecord[];
}
