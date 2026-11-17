/** Illustrazioni geometriche del metodo (guida, "Icona e immagini"):
 *  Ascolto cerchi concentrici · Restituzione semicerchi specchiati · Strategia blocchi a scala · Consegna sole sotto un arco. */
export function StepArt({ step, muted = false }: { step: string; muted?: boolean }) {
  const v = muted ? "#B9A9CC" : "#492176";
  const o = muted ? "#F7C9A4" : "#FF8427";
  const l = muted ? "#D9C6EF" : "#A36DE2";
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      {step === "ascolto" && (<><circle cx="32" cy="32" r="28" fill={v} /><circle cx="32" cy="32" r="20" fill={l} /><circle cx="32" cy="32" r="12" fill={o} /><circle cx="32" cy="32" r="5" fill="#F3F4EF" /></>)}
      {step === "restituzione" && (<><path d="M32 4a28 28 0 0 0 0 56z" fill={v} /><path d="M32 4a28 28 0 0 1 0 56z" fill={o} /><path d="M32 16a16 16 0 0 0 0 32z" fill={l} /><path d="M32 16a16 16 0 0 1 0 32z" fill="#3F2951" /></>)}
      {step === "strategia" && (<><rect x="6" y="40" width="14" height="18" fill={l} /><rect x="24" y="26" width="14" height="32" fill={v} /><rect x="42" y="8" width="14" height="50" fill={o} /><circle cx="13" cy="31" r="5" fill={l} /></>)}
      {step === "consegna" && (<><path d="M6 50a26 26 0 0 1 52 0z" fill={l} /><circle cx="32" cy="50" r="13" fill={o} /><rect x="4" y="50" width="56" height="6" fill={v} /></>)}
    </svg>
  );
}

export const STEPS = ["ascolto", "restituzione", "strategia", "consegna"] as const;
