// frontend/src/services/analyze.ts
import { apiClient } from "./api";
import {
  EngineResponse,
  AnalysisRecord,
} from "../../../shared/types/result.types";
// -----------------------------
// ANALYZE INPUT
// -----------------------------
export async function analyzeInput(
  input: string,
  token: string
): Promise<EngineResponse> {
  return apiClient.post<EngineResponse>(
    "/analyze",
    { input },
    token
  );
}
// -----------------------------
// GET HISTORY (PAGINATED)
// -----------------------------
export async function getHistory(
  token: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: AnalysisRecord[]; total: number }> {
  return apiClient.get<{ data: AnalysisRecord[]; total: number }>(
    `/analyze/history?page=${page}&limit=${limit}`,
    token
  );
}
// -----------------------------
// GET SINGLE ANALYSIS
// -----------------------------
export async function getAnalysis(
  id: string,
  token: string
): Promise<AnalysisRecord> {
  return apiClient.get<AnalysisRecord>(
    `/analyze/history/${id}`,
    token
  );
}
// -----------------------------
// DELETE ANALYSIS
// -----------------------------
export async function deleteAnalysis(
  id: string,
  token: string
): Promise<void> {
  await apiClient.delete<{ message: string }>(
    `/analyze/history/${id}`,
    token
  );
}
// -----------------------------
// SUBMIT FEEDBACK
// -----------------------------
export async function submitFeedback(
  analysisId: string,
  rating: number,
  comment: string,
  token: string
): Promise<void> {
  await apiClient.post(
    "/history/feedback",
    {
      analysisId,
      rating,
      comment,
    },
    token
  );
}
