import type { IntentType } from "./ajit.service.js";
import type { EmotionType } from "./manu.service.js";

export type PathOption = {
  action: string;
  risk: "low" | "medium" | "high";
  stability: "low" | "medium" | "high";
  outcome: "positive" | "negative" | "mixed";
};

export type SimulationResult = {
  bestPath: PathOption;
  alternatives: PathOption[];
};

function getEmotionRisk(emotion: EmotionType): number {
  switch (emotion) {
    case "angry": return 3;
    case "anxious": case "stressed": case "sad": case "confused": return 2;
    case "calm": return 1;
    default: return 2;
  }
}

function getIntentStability(intent: IntentType): number {
  switch (intent) {
    case "career": case "health": return 3;
    case "decision": case "relationship": return 2;
    case "conflict": case "unclear": return 1;
    default: return 1;
  }
}

function toLevel(score: number): "low" | "medium" | "high" {
  if (score >= 3) return "high";
  if (score === 2) return "medium";
  return "low";
}

function evaluateOutcome(riskScore: number, stabilityScore: number): "positive" | "negative" | "mixed" {
  if (riskScore <= 1 && stabilityScore >= 2) return "positive";
  if (riskScore >= 3 && stabilityScore <= 1) return "negative";
  return "mixed";
}

function generateActions(intent: IntentType): string[] {
  switch (intent) {
    case "relationship": return ["Communicate calmly and clarify misunderstandings", "Take temporary space and reflect", "End the relationship respectfully"];
    case "conflict": return ["Address the issue directly with facts", "Ignore temporarily and observe", "Escalate the issue to authority"];
    case "decision": return ["Gather more information before deciding", "Take a calculated risk and act", "Delay the decision"];
    case "career": return ["Upskill and prepare before next move", "Switch immediately", "Stay and stabilize current position"];
    case "health": return ["Consult a professional", "Self-manage with routine changes", "Ignore symptoms temporarily"];
    default: return ["Wait and observe", "Seek clarity", "Take minimal action"];
  }
}

export function simulatePaths(intent: IntentType, emotion: EmotionType): SimulationResult {
  const actions = generateActions(intent);
  const emotionRisk = getEmotionRisk(emotion);
  const intentStability = getIntentStability(intent);

  const results: PathOption[] = actions.map((action, index) => {
    const variation = index;
    const riskScore = Math.min(3, emotionRisk + variation - 1);
    const stabilityScore = Math.max(1, intentStability - variation + 1);
    return { action, risk: toLevel(riskScore), stability: toLevel(stabilityScore), outcome: evaluateOutcome(riskScore, stabilityScore) };
  });

  const bestPath = results.reduce((best, current) => {
    const scoreCurrent = (current.stability === "high" ? 3 : current.stability === "medium" ? 2 : 1) - (current.risk === "high" ? 3 : current.risk === "medium" ? 2 : 1);
    const scoreBest = (best.stability === "high" ? 3 : best.stability === "medium" ? 2 : 1) - (best.risk === "high" ? 3 : best.risk === "medium" ? 2 : 1);
    return scoreCurrent > scoreBest ? current : best;
  });

  return { bestPath, alternatives: results.filter((r) => r !== bestPath) };
}
