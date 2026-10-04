/**
 * Invite links look like  https://<site>/?ref=ABCD2345 . The code is kept in the browser until the
 * new user is signed in, then applied once (see ReferralRedeemer). Storage can be unavailable
 * (private window, blocked cookies), so every access is guarded and the app works without it.
 */
const KEY = "sx_pending_ref";

export function normalizeReferralCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Reads ?ref= from the current address and remembers it. Call once on app start. */
export function capturePendingReferral(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    const code = ref ? normalizeReferralCode(ref) : "";
    if (code.length === 8) window.localStorage.setItem(KEY, code);
  } catch {
    /* ignore */
  }
}

export function getPendingReferral(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function inviteLink(code: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/?ref=${code}`;
}
