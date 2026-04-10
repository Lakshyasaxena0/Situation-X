import { analyzeIntent, type IntentResult } from "./ajit.service.js";
import { analyzeEmotion, type EmotionResult } from "./manu.service.js";
import { simulatePaths, type SimulationResult } from "./sivi.service.js";
import { analyzeAstro, type AstroResult } from "./astro.service.js";
import { calculateVedicCharts, type VedicChartSet } from "./vedic.service.js";

export type EngineResponse = {
  intent: IntentResult;
  emotion: EmotionResult;
  simulation: SimulationResult;
  finalVerdict: {
    recommendedAction: string;
    reasoning: string;
    riskLevel: "low" | "medium" | "high";
  };
  astro: AstroResult & { vedicCharts?: VedicChartSet };
};

function applyEthicalFilter(input: string): string {
  const unsafePatterns = ["revenge", "harm", "manipulate", "control someone", "blackmail"];
  let sanitized = input.toLowerCase();
  for (const pattern of unsafePatterns) {
    if (sanitized.includes(pattern)) sanitized = sanitized.replace(pattern, "");
  }
  return sanitized.trim();
}

function deriveFinalVerdict(simulation: SimulationResult, emotion: EmotionResult): EngineResponse["finalVerdict"] {
  const best = simulation.bestPath;
  let reasoning = "";
  if (emotion.emotion === "angry" || emotion.emotion === "anxious") {
    reasoning = "Your current emotional state suggests avoiding impulsive actions. A stable and low-risk approach is recommended.";
  } else if (emotion.emotion === "confused") {
    reasoning = "Clarity is currently low. A balanced and stable path will help avoid unnecessary mistakes.";
  } else {
    reasoning = "Your emotional state is relatively stable. You can proceed with a calculated and structured decision.";
  }
  return { recommendedAction: best.action, reasoning, riskLevel: best.risk };
}

export function runEngine(input: string, birthDate?: string, birthTime?: string, latitude?: number, longitude?: number): EngineResponse {
  if (!input || input.length < 10) throw new Error("Input must be at least 10 characters long.");

  const cleanInput = applyEthicalFilter(input);
  const intentResult = analyzeIntent(cleanInput);
  const emotionResult = analyzeEmotion(cleanInput);
  const simulationResult = simulatePaths(intentResult.intent, emotionResult.emotion);
  const finalVerdict = deriveFinalVerdict(simulationResult, emotionResult);
  const astroResult = analyzeAstro(intentResult.intent, emotionResult.emotion);

  let vedicCharts: VedicChartSet | undefined;
  if (birthDate) {
    try {
      vedicCharts = calculateVedicCharts(birthDate, birthTime, latitude, longitude);
    } catch (e) {
      // Vedic charts are optional
    }
  }

  return {
    intent: intentResult,
    emotion: emotionResult,
    simulation: simulationResult,
    finalVerdict,
    astro: { ...astroResult, ...(vedicCharts ? { vedicD1: vedicCharts.d1, vedicD9: vedicCharts.d9, vedicD10: vedicCharts.d10 } : {}) },
  };
}
