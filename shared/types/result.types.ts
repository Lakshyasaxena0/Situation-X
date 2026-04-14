// shared/types/result.types.ts
// -----------------------------
// CORE ENUM TYPES
// -----------------------------
export type IntentType =
  | "decision"
  | "relationship"
  | "conflict"
  | "career"
  | "health"
  | "unclear";
export type EmotionType =
  | "calm"
  | "stressed"
  | "anxious"
  | "angry"
  | "sad"
  | "confused";
export type RiskLevel = "low" | "medium" | "high";
export type OutcomeType = "positive" | "negative" | "mixed";
export type SignalType = "favorable" | "challenging" | "neutral";
// -----------------------------
// INTENT + EMOTION RESULTS
// -----------------------------
export type IntentResult = {
  intent: IntentType;
  confidence: "low" | "medium" | "high";
  score: number;
};
export type EmotionResult = {
  emotion: EmotionType;
  intensity: "low" | "medium" | "high";
  score: number;
};
// -----------------------------
// SIMULATION TYPES (SIVI)
// -----------------------------
export type PathOption = {
  action: string;
  risk: RiskLevel;
  stability: "low" | "medium" | "high";
  outcome: OutcomeType;
};
export type SimulationResult = {
  bestPath: PathOption;
  alternatives: PathOption[];
};
// -----------------------------
// ASTRO TYPES
// -----------------------------
export type AstroInfluence = {
  dominantPlanet: string;
  stability: "low" | "medium" | "high";
  risk: RiskLevel;
  signal: SignalType;
};
export type AstroResult = {
  influence: AstroInfluence;
  interpretation: string;
};
// -----------------------------
// FINAL VERDICT
// -----------------------------
export type FinalVerdict = {
  recommendedAction: string;
  reasoning: string;
  riskLevel: RiskLevel;
};
// -----------------------------
// ENGINE RESPONSE (CANONICAL)
// -----------------------------
export type EngineResponse = {
  intent: IntentResult;
  emotion: EmotionResult;
  simulation: SimulationResult;
  finalVerdict: FinalVerdict;
  astro?: AstroResult;
};
// -----------------------------
// DATABASE RECORD TYPES
// -----------------------------
export type AnalysisRecord = {
  id: string;
  user_id: string;
  input: string;
  intent: IntentType;
  emotion: EmotionType;
  risk_level: RiskLevel;
  recommended_action: string;
  reasoning: string;
  simulation: SimulationResult;
  astro?: AstroResult;
  created_at: string;
};
// -----------------------------
// USER PROFILE
// -----------------------------
export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};
// -----------------------------
// FEEDBACK RECORD
// -----------------------------
export type FeedbackRecord = {
  id: string;
  analysis_id: string;
  user_id: string;
  rating: number; // 1–5
  comment: string | null;
  created_at: string;
};
