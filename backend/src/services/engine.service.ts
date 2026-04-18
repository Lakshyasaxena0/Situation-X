import Groq from "groq-sdk";
import { analyzeIntent, IntentResult } from "./ajit.service";
import { analyzeEmotion, EmotionResult } from "./manu.service";
import { simulatePaths, SimulationResult } from "./sivi.service";
import { analyzeAstro, AstroResult } from "./astro.service";
import { env } from "../config/env";

let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  return groqClient;
}

export type FinalVerdict = { recommendedAction: string; reasoning: string; riskLevel: "low"|"medium"|"high"; };
export type EngineResponse = { intent: IntentResult; emotion: EmotionResult; simulation: SimulationResult; astro?: AstroResult; finalVerdict: FinalVerdict; };

const HARD = ["kill","murder","suicide","bomb","weapon","poison"];
const SOFT = ["harm","revenge","manipulate","blackmail","stalk","abuse","threaten","violence","drug"];

function ethicalFilter(input: string): string {
  const low = input.toLowerCase();
  if (HARD.some(t => low.includes(t))) throw new Error("Input contains unsafe content. Please rephrase your situation.");
  let s = input;
  for (const t of SOFT) s = s.replace(new RegExp(`\\b${t}\\b`,"gi"),"");
  return s.replace(/\s+/g," ").trim();
}

function deterministicVerdict(simulation: SimulationResult, emotion: EmotionResult): FinalVerdict {
  const best = simulation.bestPath;
  let reasoning: string;
  if (emotion.emotion === "angry" || emotion.emotion === "anxious") {
    reasoning = "Your current emotional state suggests avoiding impulsive actions. A stable and low-risk approach is recommended.";
  } else if (emotion.emotion === "confused") {
    reasoning = "Clarity is low. A balanced path will help avoid unnecessary mistakes.";
  } else if (emotion.emotion === "sad") {
    reasoning = "Emotional heaviness can cloud judgment. Take a measured approach from a grounded place.";
  } else {
    reasoning = "Your emotional state is stable. Proceed with a calculated and structured decision.";
  }
  return { recommendedAction: best.action, reasoning, riskLevel: best.risk };
}

async function groqVerdict(input: string, intent: IntentResult, emotion: EmotionResult, simulation: SimulationResult, astro: AstroResult | undefined): Promise<FinalVerdict> {
  const best = simulation.bestPath;
  const astroCtx = astro ? `Astrological: ${astro.influence.dominantPlanet} dominant (${astro.influence.signal}). ${astro.interpretation}` : "No astro context.";
  const sys = `You are Situation X — a deterministic AI advisory engine. Respond ONLY with valid JSON: {"recommendedAction":"one clear sentence","reasoning":"2-3 sentences explaining the best path"}`;
  const usr = `Situation: "${input}"\nIntent: ${intent.intent} (${intent.confidence})\nEmotion: ${emotion.emotion} (${emotion.intensity})\nBest path: ${best.action} (risk:${best.risk}, stability:${best.stability}, outcome:${best.outcome})\nAlternatives: ${simulation.alternatives.map((p,i)=>`${i+1}. ${p.action} (risk:${p.risk})`).join(", ")}\n${astroCtx}`;
  const res = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role:"system", content:sys },{ role:"user", content:usr }],
    temperature: 0.3, max_tokens: 300,
    response_format: { type:"json_object" },
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
  if (!parsed.recommendedAction || !parsed.reasoning) throw new Error("Groq response missing fields");
  return { recommendedAction: String(parsed.recommendedAction).trim(), reasoning: String(parsed.reasoning).trim(), riskLevel: best.risk };
}

export async function runEngine(input: string): Promise<EngineResponse> {
  if (!input || input.length < 10) throw new Error("Input must be at least 10 characters.");
  const clean = ethicalFilter(input);
  const intent = analyzeIntent(clean);
  const emotion = analyzeEmotion(clean);
  const simulation = simulatePaths(intent.intent, emotion.emotion);
  let astro: AstroResult | undefined;
  try { astro = analyzeAstro(intent.intent, emotion.emotion); } catch { astro = undefined; }
  let finalVerdict: FinalVerdict;
  try { finalVerdict = await groqVerdict(clean, intent, emotion, simulation, astro); }
  catch (e) { console.warn("Groq fallback:", e); finalVerdict = deterministicVerdict(simulation, emotion); }
  return { intent, emotion, simulation, astro, finalVerdict };
}
