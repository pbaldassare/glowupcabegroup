import { useEffect, useState } from "react";

/** Chiave per forzare la modalità app nel browser (solo per prove: apri /?app=1, chiudi con /?app=0). */
const FORCE_KEY = "glowup-app-mode";

function readForce(): boolean {
  try {
    const p = new URLSearchParams(window.location.search).get("app");
    if (p === "1") sessionStorage.setItem(FORCE_KEY, "1");
    if (p === "0") sessionStorage.removeItem(FORCE_KEY);
    return sessionStorage.getItem(FORCE_KEY) === "1";
  } catch {
    return false;
  }
}

/** true se l'app gira installata (PWA aperta dalla schermata Home), false se è un normale browser. */
export function isAppMode(): boolean {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || readForce();
}

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS si presenta come un Mac, ma con lo schermo touch
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "desktop";
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// L'evento può arrivare prima che React monti la pagina: lo teniamo da parte.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    try { localStorage.setItem("glowup-installed", "1"); } catch { /* ignora */ }
    listeners.forEach((l) => l());
  });
}

/** Stato dell'installazione: se il browser offre il pulsante nativo, e se l'app risulta già installata. */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  let installed = false;
  try { installed = localStorage.getItem("glowup-installed") === "1"; } catch { /* ignora */ }
  return {
    canPrompt: deferred !== null,
    installed,
    async install() {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      return outcome === "accepted";
    },
  };
}
