import type { EngineResponse } from "./engine.service.js";

/**
 * What one analysis costs, in credits.
 *
 * The price follows the work actually done for the question:
 *   - every module that takes part in the answer is charged (ASTRO is always part of it);
 *   - the Prashna chart reading costs more when more charts (D1, D3, D9, D10) are needed;
 *   - the AI is charged by the level of reasoning used (standard / deep / expert).
 *
 * The engine is deterministic and cheap, so the exact price is known BEFORE the AI is called and
 * can be shown to the user first. A module that had nothing to say about the text (AJIT could not
 * classify it, MANU found no emotion) is not charged.
 */

export const REASONING_DEPTHS = ["standard", "deep", "expert"] as const;
export type ReasoningDepth = (typeof REASONING_DEPTHS)[number];
export type DepthRequest = ReasoningDepth | "auto";

export const MODULE_COSTS = {
  astro: 4,           // Prashna chart + dasha + transits (mandatory, always charged)
  astroExtraChart: 2, // each additional divisional chart beyond D1 that the question needs
  ajit: 1,            // intent detection
  manu: 1,            // emotion detection
  sivi: 2,            // path simulation
} as const;

export const AI_COSTS: Record<ReasoningDepth, number> = { standard: 4, deep: 8, expert: 14 };

export const DEPTH_LABELS: Record<ReasoningDepth, string> = {
  standard: "Standard reasoning",
  deep: "Deep reasoning",
  expert: "Expert reasoning",
};

export type CostLine = {
  key: "astro" | "ajit" | "manu" | "sivi" | "ai";
  label: string;
  credits: number;
  note: string;
};

export type CreditCost = {
  total: number;
  /** Part of the total that pays for the AI; refunded if the AI could not answer. */
  aiCredits: number;
  depth: ReasoningDepth;
  depthChosen: "auto" | "user";
  lines: CostLine[];
};

export function isDepthRequest(value: unknown): value is DepthRequest {
  return value === "auto" || (typeof value === "string" && (REASONING_DEPTHS as readonly string[]).includes(value));
}

/**
 * How demanding the question is, from 0 upwards. Longer, riskier, more emotional or
 * health/conflict questions deserve more careful reasoning.
 */
export function complexityPoints(situation: string, engine: EngineResponse): number {
  const words = situation.trim().split(/\s+/).filter(Boolean).length;
  let points = 0;
  if (words >= 60) points += 1;
  if (words >= 150) points += 1;
  if (engine.finalVerdict.riskLevel === "high") points += 1;
  if (engine.emotion.intensity === "high") points += 1;
  if (engine.intent.intent === "health" || engine.intent.intent === "conflict") points += 1;
  return points;
}

export function suggestDepth(situation: string, engine: EngineResponse): ReasoningDepth {
  const points = complexityPoints(situation, engine);
  return points >= 4 ? "expert" : points >= 2 ? "deep" : "standard";
}

export function computeCost(situation: string, engine: EngineResponse, request: DepthRequest = "auto"): CreditCost {
  const depth = request === "auto" ? suggestDepth(situation, engine) : request;
  const lines: CostLine[] = [];

  const extraCharts = Math.max(0, (engine.astro.prashna?.chartsUsed.length ?? 1) - 1);
  lines.push({
    key: "astro",
    label: "ASTRO - Prashna chart",
    credits: MODULE_COSTS.astro + extraCharts * MODULE_COSTS.astroExtraChart,
    note: extraCharts > 0
      ? `Always included. ${extraCharts + 1} charts read for this question.`
      : "Always included. Chart read for this question.",
  });
  if (engine.intent.intent !== "unclear") {
    lines.push({ key: "ajit", label: "AJIT - intent", credits: MODULE_COSTS.ajit, note: `Question understood as: ${engine.intent.intent}.` });
  }
  if (engine.emotion.score > 0) {
    lines.push({ key: "manu", label: "MANU - emotion", credits: MODULE_COSTS.manu, note: `Emotional tone detected: ${engine.emotion.emotion}.` });
  }
  lines.push({ key: "sivi", label: "SIVI - path simulation", credits: MODULE_COSTS.sivi, note: "Compares the possible paths." });
  lines.push({
    key: "ai",
    label: `AI - ${DEPTH_LABELS[depth]}`,
    credits: AI_COSTS[depth],
    note: request === "auto" ? "Level chosen from how complex the question is." : "Level chosen by you.",
  });

  const total = lines.reduce((sum, l) => sum + l.credits, 0);
  return { total, aiCredits: AI_COSTS[depth], depth, depthChosen: request === "auto" ? "auto" : "user", lines };
}

/** Cost after the AI could not answer: the user keeps the engine + astrology answer and the AI part is refunded. */
export function withoutAi(cost: CreditCost): { total: number; lines: CostLine[] } {
  return { total: cost.total - cost.aiCredits, lines: cost.lines.filter((l) => l.key !== "ai") };
}
