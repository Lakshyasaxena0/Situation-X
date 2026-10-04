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

export function inviteMessage(code: string): string {
  return `I use Situation X for clear decisions (AI + Vedic astrology). Join with my invite code ${code}: ${inviteLink(code)}`;
}

/** Opens the phone's share sheet, or WhatsApp when the browser has none. Resolves quietly if the user cancels. */
export async function shareInvite(code: string): Promise<void> {
  const link = inviteLink(code);
  const message = inviteMessage(code);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Situation X", text: message, url: link });
      return;
    } catch (err) {
      if ((err as { name?: string } | null)?.name === "AbortError") return; // the user closed the sheet
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
