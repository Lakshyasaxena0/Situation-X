export type EmotionType = "calm" | "stressed" | "anxious" | "angry" | "sad" | "confused";

export type EmotionResult = {
  emotion: EmotionType;
  intensity: "low" | "medium" | "high";
  score: number;
};

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  calm: ["fine", "okay", "normal", "stable", "peaceful", "clear"],
  stressed: ["stress", "pressure", "overwhelmed", "burden", "tension"],
  anxious: ["anxious", "worried", "fear", "scared", "nervous", "uneasy"],
  angry: ["angry", "frustrated", "irritated", "hate", "annoyed", "gussa"],
  sad: ["sad", "hurt", "depressed", "low", "cry", "pain"],
  confused: ["confused", "dont know", "not sure", "uncertain", "doubt"],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/gi, "").replace(/\s+/g, " ").trim();
}

function countMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) count++;
  }
  return count;
}

function calculateScores(text: string): Record<EmotionType, number> {
  const scores: Record<EmotionType, number> = { calm: 0, stressed: 0, anxious: 0, angry: 0, sad: 0, confused: 0 };
  for (const emotion in EMOTION_KEYWORDS) {
    const key = emotion as EmotionType;
    scores[key] = countMatches(text, EMOTION_KEYWORDS[key]);
  }
  return scores;
}

function getIntensity(score: number): "low" | "medium" | "high" {
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function analyzeEmotion(input: string): EmotionResult {
  if (!input || input.length < 10) return { emotion: "confused", intensity: "low", score: 0 };
  const normalized = normalize(input);
  const scores = calculateScores(normalized);
  let maxEmotion: EmotionType = "confused";
  let maxScore = 0;
  for (const emotion in scores) {
    const key = emotion as EmotionType;
    if (scores[key] > maxScore) { maxScore = scores[key]; maxEmotion = key; }
  }
  if (maxScore === 0) return { emotion: "confused", intensity: "low", score: 0 };
  return { emotion: maxEmotion, intensity: getIntensity(maxScore), score: maxScore };
}
