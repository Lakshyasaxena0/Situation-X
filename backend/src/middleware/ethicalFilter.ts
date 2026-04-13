// backend/src/middleware/ethicalFilter.ts
import { Request, Response, NextFunction } from "express";
// -----------------------------
// BLOCKED (HARD) TERMS
// -----------------------------
const HARD_BLOCK_TERMS = [
  "kill",
  "murder",
  "suicide",
  "bomb",
  "weapon",
  "poison",
];
// -----------------------------
// SOFT VIOLATION TERMS
// -----------------------------
const SOFT_TERMS = [
  "harm",
  "revenge",
  "manipulate",
  "blackmail",
  "stalk",
  "abuse",
  "threaten",
  "violence",
  "drug",
];
// -----------------------------
// NORMALIZATION
// -----------------------------
function normalize(text: string): string {
  return text.toLowerCase().trim();
}
// -----------------------------
// HARD BLOCK CHECK
// -----------------------------
function containsHardViolation(text: string): boolean {
  return HARD_BLOCK_TERMS.some((term) =>
    text.includes(term)
  );
}
// -----------------------------
// SOFT CLEANER
// -----------------------------
function sanitizeSoftViolations(text: string): string {
  let sanitized = text;
  for (const term of SOFT_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    sanitized = sanitized.replace(regex, "");
  }
  return sanitized.replace(/\s+/g, " ").trim();
}
// -----------------------------
// MIDDLEWARE
// -----------------------------
export function ethicalFilter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const input = req.body?.input;
  if (typeof input !== "string") {
    res.status(400).json({
      error: "Invalid input format",
    });
    return;
  }
  const normalized = normalize(input);
  // HARD BLOCK
  if (containsHardViolation(normalized)) {
    console.warn("🚫 Ethical block triggered:", {
      input,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({
      error:
        "Input contains unsafe content. Please rephrase your situation.",
    });
    return;
  }
  // SOFT SANITIZATION
  const cleaned = sanitizeSoftViolations(normalized);
  req.body.input = cleaned;
  next();
}
