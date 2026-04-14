// frontend/src/utils/formatters.ts
// -----------------------------
// FORMAT DATE
// -----------------------------
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
// -----------------------------
// FORMAT RISK LEVEL
// -----------------------------
export function formatRiskLevel(risk: string): string {
  if (!risk) return "";
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}
// -----------------------------
// FORMAT EMOTION
// -----------------------------
export function formatEmotion(emotion: string): string {
  if (!emotion) return "";
  return emotion.charAt(0).toUpperCase() + emotion.slice(1);
}
// -----------------------------
// FORMAT INTENT
// -----------------------------
export function formatIntent(intent: string): string {
  if (!intent) return "";
  const mapping: Record<string, string> = {
    decision: "Decision Making",
    relationship: "Relationship Advice",
    conflict: "Conflict Resolution",
    career: "Career Guidance",
    health: "Health Advisory",
    unclear: "General Insight",
  };
  return mapping[intent] || intent;
}
// -----------------------------
// EMOTION COLOR (TAILWIND)
// -----------------------------
export function getEmotionColor(emotion: string): string {
  const mapping: Record<string, string> = {
    calm: "text-green-500",
    stressed: "text-yellow-500",
    anxious: "text-orange-500",
    angry: "text-red-500",
    sad: "text-blue-500",
    confused: "text-purple-500",
  };
  return mapping[emotion] || "text-gray-500";
}
