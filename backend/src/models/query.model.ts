// backend/src/models/query.model.ts
import { supabase } from "../config/db";
import {
  AnalysisRecord,
  EngineResponse,
} from "../../../shared/types/result.types";
// -----------------------------
// SAVE ANALYSIS
// -----------------------------
export async function saveAnalysis(
  userId: string,
  input: string,
  engineResponse: EngineResponse
): Promise<AnalysisRecord> {
  const payload = {
    user_id: userId,
    input,
    intent: engineResponse.intent.intent,
    emotion: engineResponse.emotion.emotion,
    risk_level: engineResponse.finalVerdict.riskLevel,
    recommended_action: engineResponse.finalVerdict.recommendedAction,
    reasoning: engineResponse.finalVerdict.reasoning,
    simulation: engineResponse.simulation,
    astro: engineResponse.astro ?? null,
  };
  const { data, error } = await supabase
    .from("analyses")
    .insert([payload])
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to save analysis: ${error?.message}`);
  }
  return data as AnalysisRecord;
}
// -----------------------------
// GET ANALYSIS BY USER (PAGINATED)
// -----------------------------
export async function getAnalysisByUser(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: AnalysisRecord[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from("analyses")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) {
    throw new Error(`Failed to fetch analyses: ${error.message}`);
  }
  return {
    data: (data ?? []) as AnalysisRecord[],
    total: count ?? 0,
  };
}
// -----------------------------
// GET SINGLE ANALYSIS (OWNERSHIP SAFE)
// -----------------------------
export async function getAnalysisById(
  id: string,
  userId: string
): Promise<AnalysisRecord | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch analysis: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as AnalysisRecord;
}
// -----------------------------
// DELETE ANALYSIS (OWNERSHIP SAFE)
// -----------------------------
export async function deleteAnalysis(
  id: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to delete analysis: ${error.message}`);
  }
  return !!data;
}
