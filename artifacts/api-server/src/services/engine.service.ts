import { analyzeIntent, type IntentResult } from "./ajit.service.js";
import { analyzeEmotion, type EmotionResult } from "./manu.service.js";
import { simulatePaths, type SimulationResult } from "./sivi.service.js";
import { analyzeAstro, type AstroResult } from "./astro.service.js";

export type EngineResponse = {
  intent: IntentResult;
  emotion: EmotionResult;
  simulation: SimulationResult;
  finalVerdict: {
    recommendedAction: string;
    reasoning: string;
    riskLevel: "low" | "medium" | "high";
  };
  astro: AstroResult;
};

const UNSAFE_PATTERN = new RegExp(
  "\\b(?:revenge|harm(?:s|ed|ing|ful)?|manipulat(?:e|es|ed|d|ing|ion)|control someone|blackmail(?:s|ed|ing)?)\\b",
  "g",
);

function applyEthicalFilter(input: string): string {
  return input.toLowerCase().replace(UNSAFE_PATTERN, " ").replace(/\s+/g, " ").trim();
}

function deriveFinalVerdict(simulation: SimulationResult, emotion: EmotionResult): EngineResponse["finalVerdict"] {
  const best = simulation.bestPath;
  let reasoning = "";
  if (emotion.emotion === "angry" || emotion.emotion === "anxious" || emotion.emotion === "stressed" || emotion.emotion === "sad") {
    reasoning = "Your current emotional state suggests avoiding impulsive actions. A stable and low-risk approach is recommended.";
  } else if (emotion.emotion === "confused") {
    reasoning = "Clarity is currently low. A balanced and stable path will help avoid unnecessary mistakes.";
  } else {
    reasoning = "Your emotional state is relatively stable. You can proceed with a calculated and structured decision.";
  }
  return { recommendedAction: best.action, reasoning, riskLevel: best.risk };
}

export function runEngine(input: string, latitude?: number, longitude?: number): EngineResponse {
  if (!input || input.length < 10) throw new Error("Input must be at least 10 characters long.");

  const cleanInput = applyEthicalFilter(input);
  const intentResult = analyzeIntent(cleanInput);
  const emotionResult = analyzeEmotion(cleanInput);
  const simulationResult = simulatePaths(intentResult.intent, emotionResult.emotion);
  const finalVerdict = deriveFinalVerdict(simulationResult, emotionResult);
  // ASTRO casts the Prashna charts (D1, D3, D9, D10) for the moment of the question and reads
  // the ones that matter for the intent AJIT detected. No birth details are involved.
  const astroResult = analyzeAstro(intentResult.intent, emotionResult.emotion, { latitude, longitude });

  return {
    intent: intentResult,
    emotion: emotionResult,
    simulation: simulationResult,
    finalVerdict,
    astro: astroResult,
  };
}
