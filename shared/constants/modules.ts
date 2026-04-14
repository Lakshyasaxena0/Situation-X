// shared/constants/modules.ts
import { IntentType, EmotionType, RiskLevel } from "../types/result.types";
// -----------------------------
// INTENT CATEGORIES
// -----------------------------
export const INTENT_CATEGORIES: IntentType[] = [
  "decision",
  "relationship",
  "conflict",
  "career",
  "health",
  "unclear",
];
// -----------------------------
// EMOTION CATEGORIES
// -----------------------------
export const EMOTION_CATEGORIES: EmotionType[] = [
  "calm",
  "stressed",
  "anxious",
  "angry",
  "sad",
  "confused",
];
// -----------------------------
// RISK LEVELS
// -----------------------------
export const RISK_LEVELS: RiskLevel[] = [
  "low",
  "medium",
  "high",
];
// -----------------------------
// MODULE DISPLAY NAMES
// -----------------------------
export const MODULE_NAMES = {
  AJIT: "Intent Analysis",
  MANU: "Emotional Analysis",
  SIVI: "Decision Simulation",
  ASTRO: "Astrological Insight",
  ENGINE: "Final Decision Engine",
} as const;
// -----------------------------
// OPTIONAL: LABEL HELPERS
// -----------------------------
export function getIntentLabel(intent: IntentType): string {
  switch (intent) {
    case "decision":
      return "Decision Making";
    case "relationship":
      return "Relationship Advice";
    case "conflict":
      return "Conflict Resolution";
    case "career":
      return "Career Guidance";
    case "health":
      return "Health Advisory";
    case "unclear":
      return "General Inquiry";
    default:
      return "General Inquiry";
  }
}
export function getEmotionLabel(emotion: EmotionType): string {
  switch (emotion) {
    case "calm":
      return "Calm";
    case "stressed":
      return "Stressed";
    case "anxious":
      return "Anxious";
    case "angry":
      return "Angry";
    case "sad":
      return "Sad";
    case "confused":
      return "Confused";
    default:
      return "Unknown";
  }
}
