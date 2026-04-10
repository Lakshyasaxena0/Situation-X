import type { IntentType } from "./ajit.service.js";
import type { EmotionType } from "./manu.service.js";

export type AstroInfluence = {
  dominantPlanet: string;
  stability: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  signal: "favorable" | "challenging" | "neutral";
};

export type AstroResult = {
  influence: AstroInfluence;
  interpretation: string;
};

function mapIntentToPlanet(intent: IntentType): string {
  switch (intent) {
    case "relationship": return "Venus";
    case "conflict": return "Mars";
    case "decision": return "Mercury";
    case "career": return "Saturn";
    case "health": return "Sun";
    default: return "Moon";
  }
}

function mapEmotionToPlanetEffect(emotion: EmotionType): string {
  switch (emotion) {
    case "angry": return "Mars";
    case "anxious": case "sad": return "Moon";
    case "stressed": return "Saturn";
    case "confused": return "Mercury";
    case "calm": return "Jupiter";
    default: return "Moon";
  }
}

function calculateStability(intentPlanet: string, emotionPlanet: string): "low" | "medium" | "high" {
  if (intentPlanet === emotionPlanet) return "low";
  if ((intentPlanet === "Venus" && emotionPlanet === "Jupiter") || (intentPlanet === "Mercury" && emotionPlanet === "Jupiter")) return "high";
  return "medium";
}

function calculateRisk(emotion: EmotionType): "low" | "medium" | "high" {
  switch (emotion) {
    case "angry": return "high";
    case "anxious": case "stressed": case "sad": return "medium";
    case "calm": return "low";
    default: return "medium";
  }
}

function deriveSignal(stability: string, risk: string): "favorable" | "challenging" | "neutral" {
  if (stability === "high" && risk === "low") return "favorable";
  if (stability === "low" && risk === "high") return "challenging";
  return "neutral";
}

function generateInterpretation(planet: string, signal: string): string {
  if (signal === "favorable") return `${planet} influence is supportive. This is a good time for stable and thoughtful actions.`;
  if (signal === "challenging") return `${planet} influence indicates tension. Avoid impulsive decisions and allow time for clarity.`;
  return `${planet} influence is neutral. Balanced actions will lead to better outcomes.`;
}

export function analyzeAstro(intent: IntentType, emotion: EmotionType): AstroResult {
  const intentPlanet = mapIntentToPlanet(intent);
  const emotionPlanet = mapEmotionToPlanetEffect(emotion);
  const stability = calculateStability(intentPlanet, emotionPlanet);
  const risk = calculateRisk(emotion);
  const signal = deriveSignal(stability, risk);
  const dominantPlanet = stability === "low" ? emotionPlanet : intentPlanet;
  return { influence: { dominantPlanet, stability, risk, signal }, interpretation: generateInterpretation(dominantPlanet, signal) };
}
