import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "sx_install_dismissed_at";
const DISMISS_DAYS = 14;

function dismissedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function alreadyInstalled(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/**
 * "Install the app" banner. Chrome / Edge (Android and Windows) offer a real install button;
 * iPhone Safari has no such button, so it gets the "Share -> Add to Home Screen" instruction.
 * Hidden when the app is already installed, and for 14 days after the user closes it.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (alreadyInstalled() || dismissedRecently()) return;
    setHidden(false);
    setIos(isIosSafari());
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    if (choice.outcome === "accepted") setHidden(true);
    else dismiss();
  }

  if (hidden || (!event && !ios)) return null;

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2.5 text-foreground">
        {event ? <Download className="w-4 h-4 text-primary shrink-0" /> : <Share className="w-4 h-4 text-primary shrink-0" />}
        <span>{event ? "Install Situation X as an app on this device." : "Install this app: tap Share, then “Add to Home Screen”."}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {event && (
          <Button size="sm" onClick={() => void install()} className="bg-primary text-primary-foreground hover:opacity-90">
            Install
          </Button>
        )}
        <button onClick={dismiss} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
