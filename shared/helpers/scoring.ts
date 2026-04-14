// shared/helpers/scoring.ts
import { EngineResponse, RiskLevel } from "../types/result.types";
// -----------------------------
// INTERNAL HELPERS
// -----------------------------
function riskToScore(risk: RiskLevel): number {
  switch (risk) {
    case "low":
      return 80;
    case "medium":
      return 50;
    case "high":
      return 20;
    default:
      return 50;
  }
}
function emotionPenalty(intensity: string): number {
  switch (intensity) {
    case "low":
      return 0;
    case "medium":
      return -10;
    case "high":
      return -20;
    default:
      return -10;
  }
}
function outcomeScore(outcome: string): number {
  switch (outcome) {
    case "positive":
      return 20;
    case "mixed":
      return 0;
    case "negative":
      return -20;
    default:
      return 0;
  }
}
// Clamp value between 0–100
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
// -----------------------------
// MAIN SCORING FUNCTION
// -----------------------------
export function computeScore(
  response: EngineResponse
): {
  overallScore: number;
  overallResult: "YES" | "NO" | "CONDITIONAL" | "UNCERTAIN";
} {
  const riskScore = riskToScore(response.finalVerdict.riskLevel);
  const emotionImpact = emotionPenalty(response.emotion.intensity);
  const outcomeImpact = outcomeScore(
    response.simulation.bestPath.outcome
  );
  // Base score calculation
  let score = riskScore + emotionImpact + outcomeImpact;
  // Normalize
  score = clamp(score);
  // -----------------------------
  // RESULT CLASSIFICATION
  // -----------------------------
  let overallResult: "YES" | "NO" | "CONDITIONAL" | "UNCERTAIN";
  if (score >= 75) {
    overallResult = "YES";
  } else if (score >= 50) {
    overallResult = "CONDITIONAL";
  } else if (score >= 25) {
    overallResult = "UNCERTAIN";
  } else {
    overallResult = "NO";
  }
  return {
    overallScore: score,
    overallResult,
  };
}
