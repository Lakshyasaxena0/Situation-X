// Word-aware keyword matching shared by the AJIT / MANU engines and the ethical filter.

const cache = new Map<string, RegExp>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `keyword` occurs in `text` starting at a word boundary, so that
 * "ex" does not match "explain", "work" does not match "network" and "clear"
 * does not match "unclear". Keywords of one or two letters must be whole
 * words; longer ones may carry a suffix ("stress" matches "stressed").
 */
export function matchesKeyword(text: string, keyword: string): boolean {
  let re = cache.get(keyword);
  if (!re) {
    const body = escapeRegExp(keyword);
    re = new RegExp(keyword.length <= 2 ? `\\b${body}\\b` : `\\b${body}`);
    cache.set(keyword, re);
  }
  return re.test(text);
}
