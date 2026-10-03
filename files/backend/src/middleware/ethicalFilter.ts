// backend/src/middleware/ethicalFilter.ts
import { Request, Response, NextFunction } from "express";
// -----------------------------
// BLOCKED (HARD) TERMS
// -----------------------------
// Matched as whole words (with common inflections). Plain substring matching
// rejected harmless input such as "improve my skills" ("kill") or "Bombay" ("bomb").
const HARD_BLOCK_PATTERN =
  /\b(?:kill(?:s|ed|ing|er|ers)?|murder(?:s|ed|ing|er|ers)?|bomb(?:s|ed|ing)?|weapons?|poison(?:s|ed|ing)?)\b/i;

// Self-harm: respond with support rather than a "please rephrase" rejection.
const CRISIS_PATTERN = /\b(?:suicid(?:e|al)|kill(?:ing)? myself|end(?:ing)? my (?:own )?life)\b/i;

export const CRISIS_MESSAGE =
  "It sounds like you may be going through something very painful. This tool can't help with that, " +
  "but you don't have to face it alone. Please reach out to someone you trust, or to a helpline such as " +
  "Tele-MANAS in India (call 14416, free, 24x7).";

export type BlockedReason = "crisis" | "unsafe";

/** Returns why the text must not be analyzed, or null if it is fine. */
export function findBlockedReason(text: string): BlockedReason | null {
  if (CRISIS_PATTERN.test(text)) return "crisis";
  if (HARD_BLOCK_PATTERN.test(text)) return "unsafe";
  return null;
}

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
  const blocked = findBlockedReason(normalized);
  if (blocked) {
    // Log the category only: the text itself is private user content.
    console.warn("Ethical block triggered:", {
      reason: blocked,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json(
      blocked === "crisis"
        ? { error: CRISIS_MESSAGE, code: "crisis_support" }
        : { error: "Input contains unsafe content. Please rephrase your situation." },
    );
    return;
  }

  // SOFT SANITIZATION
  const cleaned = sanitizeSoftViolations(normalized);
  req.body.input = cleaned;
  next();
}
