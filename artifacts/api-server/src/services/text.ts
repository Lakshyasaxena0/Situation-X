// Shared text helpers for the keyword-based AJIT (intent) and MANU (emotion) engines.

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const matcherCache = new Map<string, RegExp>();

function matcherFor(keyword: string): RegExp {
  let re = matcherCache.get(keyword);
  if (!re) {
    // Match at a word start so "ex" ≠ "explain"/"next", "work" ≠ "network",
    // "clear" ≠ "unclear". Very short keywords must be whole words; longer
    // ones may carry a suffix ("stress" → "stressed", "decid" → "deciding").
    const body = escapeRegExp(keyword);
    re = new RegExp(keyword.length <= 2 ? `\\b${body}\\b` : `\\b${body}`);
    matcherCache.set(keyword, re);
  }
  return re;
}

/** Number of distinct keywords found in already-normalized text. */
export function countKeywordMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    if (matcherFor(keyword).test(text)) count++;
  }
  return count;
}
