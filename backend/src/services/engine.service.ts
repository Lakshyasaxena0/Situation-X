// backend/src/services/engine.service.ts
//
// Main orchestrator pipeline:
// Input → Ethical Filter → AJIT → MANU → SIVI → ASTRO → Groq AI → Final Verdict
//
// Groq enhances the final reasoning text using llama-3.3-70b-versatile.
// If Groq fails for any reason, the system falls back to deterministic output.
// The pipeline remains fully functional without Groq.

import Groq from "groq-sdk";
import { analyzeIntent, IntentResult } from "./ajit.service";
import { analyzeEmotion, EmotionResult } from "./manu.service";
import { simulatePaths, SimulationResult } from "./sivi.service";
import { analyzeAstro, AstroResult } from "./astro.service";
import { env } from "../config/env";

// -----------------------------------------------------------------------
// GROQ CLIENT (lazy init — only created once)
// -----------------------------------------------------------------------

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqClient;
}

// -----------------------------------------------------------------------
// OUTPUT TYPES
// -----------------------------------------------------------------------

export type FinalVerdict = {
  recommendedAction: string;
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
};

export type EngineResponse = {
  intent: IntentResult;
  emotion: EmotionResult;
  simulation: SimulationResult;
  astro?: AstroResult;
  finalVerdict: FinalVerdict;
};

// -----------------------------------------------------------------------
// ETHICAL FILTER (inline gate — also exists as middleware)
// -----------------------------------------------------------------------

const HARD_BLOCK_TERMS = [
  "kill", "murder", "suicide", "bomb", "weapon", "poison",
];

const SOFT_TERMS = [
  "harm", "revenge", "manipulate", "blackmail",
  "stalk", "abuse", "threaten", "violence", "drug",
];

function applyEthicalFilter(input: string): string {
  const lower = input.toLowerCase();

  if (HARD_BLOCK_TERMS.some((t) => lower.includes(t))) {
    throw new Error("Input contains unsafe content. Please rephrase your situation.");
  }

  let sanitized = input;
  for (const term of SOFT_TERMS) {
    sanitized = sanitized.replace(new RegExp(`\\b${term}\\b`, "gi"), "");
  }

  return sanitized.replace(/\s+/g, " ").trim();
}

// -----------------------------------------------------------------------
// DETERMINISTIC FALLBACK VERDICT
// Used when Groq is unavailable or times out
// -----------------------------------------------------------------------

function buildDeterministicVerdict(
  simulation: SimulationResult,
  emotion: EmotionResult
): FinalVerdict {
  const best = simulation.bestPath;

  let reasoning: string;

  if (emotion.emotion === "angry" || emotion.emotion === "anxious") {
    reasoning =
      "Your current emotional state suggests avoiding impulsive actions. " +
      "A stable and low-risk approach is recommended to achieve better outcomes.";
  } else if (emotion.emotion === "confused") {
    reasoning =
      "Clarity is currently low. A balanced and stable path will help " +
      "avoid unnecessary mistakes and bring more certainty.";
  } else if (emotion.emotion === "sad") {
    reasoning =
      "Emotional heaviness can cloud judgment. Take a measured approach " +
      "and ensure decisions are made from a grounded place.";
  } else {
    reasoning =
      "Your emotional state is relatively stable. You can proceed with " +
      "a calculated and structured decision for the best outcome.";
  }

  return {
    recommendedAction: best.action,
    reasoning,
    riskLevel: best.risk,
  };
}

// -----------------------------------------------------------------------
// GROQ AI ENHANCED VERDICT
// Sends structured context to Groq and gets enriched reasoning
// -----------------------------------------------------------------------

async function buildGroqVerdict(
  input: string,
  intent: IntentResult,
  emotion: EmotionResult,
  simulation: SimulationResult,
  astro: AstroResult | undefined
): Promise<FinalVerdict> {
  const best = simulation.bestPath;

  const astroContext = astro
    ? `Astrological context: ${astro.influence.dominantPlanet} is dominant ` +
      `(${astro.influence.signal} signal). ${astro.interpretation}`
    : "No astrological context available.";

  const systemPrompt = `You are Situation X — a deterministic AI advisory engine. 
You analyze real-life situations and provide clear, actionable guidance.
You must always be:
- Direct and specific (no vague advice)
- Ethical (never suggest harmful actions)
- Grounded (based on the structured data provided)
- Concise (reasoning max 3 sentences, action max 1 sentence)

Respond ONLY with a valid JSON object in this exact format:
{
  "recommendedAction": "one clear sentence describing the best action to take",
  "reasoning": "2-3 sentences explaining why this is the best path given the intent, emotion, and planetary context"
}`;

  const userPrompt = `Analyze this situation and provide a final verdict.

User's situation: "${input}"

Detected intent: ${intent.intent} (confidence: ${intent.confidence})
Detected emotion: ${emotion.emotion} (intensity: ${emotion.intensity})

Best simulated path:
- Action: ${best.action}
- Risk: ${best.risk}
- Stability: ${best.stability}
- Expected outcome: ${best.outcome}

Alternative paths:
${simulation.alternatives.map((p, i) => `${i + 1}. ${p.action} (risk: ${p.risk}, stability: ${p.stability})`).join("\n")}

${astroContext}

Based on all the above, provide the final recommended action and reasoning.`;

  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,          // Low temperature = more deterministic
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw);

  if (!parsed.recommendedAction || !parsed.reasoning) {
    throw new Error("Groq response missing required fields");
  }

  return {
    recommendedAction: String(parsed.recommendedAction).trim(),
    reasoning: String(parsed.reasoning).trim(),
    riskLevel: best.risk,
  };
}

// -----------------------------------------------------------------------
// MAIN ENGINE FUNCTION
// -----------------------------------------------------------------------

export async function runEngine(input: string): Promise<EngineResponse> {
  if (!input || input.length < 10) {
    throw new Error("Input must be at least 10 characters long.");
  }

  // Step 1: Ethical filter
  const cleanInput = applyEthicalFilter(input);

  // Step 2: Intent analysis (AJIT)
  const intentResult = analyzeIntent(cleanInput);

  // Step 3: Emotion analysis (MANU)
  const emotionResult = analyzeEmotion(cleanInput);

  // Step 4: Path simulation (SIVI)
  const simulationResult = simulatePaths(intentResult.intent, emotionResult.emotion);

  // Step 5: Astro analysis (ASTRO) — uses system clock, never fails
  let astroResult: AstroResult | undefined;
  try {
    astroResult = analyzeAstro(intentResult.intent, emotionResult.emotion);
  } catch {
    astroResult = undefined;
  }

  // Step 6: Groq AI final verdict — falls back to deterministic if Groq fails
  let finalVerdict: FinalVerdict;
  try {
    finalVerdict = await buildGroqVerdict(
      cleanInput,
      intentResult,
      emotionResult,
      simulationResult,
      astroResult
    );
  } catch (err) {
    console.warn("Groq unavailable, using deterministic fallback:", err);
    finalVerdict = buildDeterministicVerdict(simulationResult, emotionResult);
  }

  return {
    intent: intentResult,
    emotion: emotionResult,
    simulation: simulationResult,
    astro: astroResult,
    finalVerdict,
  };
}
