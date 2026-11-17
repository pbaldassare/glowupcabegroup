import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, MessageSquareText, MoreVertical, PlusSquare, Share, Smartphone, ThumbsUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { detectPlatform, useInstall } from "@/lib/pwa";

/** Home page nel browser: si scarica l'app (PWA). L'accesso dal browser è solo per il team. */
export function InstallApp({ notice }: { notice?: string }) {
  const platform = detectPlatform();
  const { canPrompt, installed, install } = useInstall();
  const [done, setDone] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-viola text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-[max(env(safe-area-inset-top),2.5rem)]">
        <Logo light className="text-5xl" />
        <p className="mt-3 text-lg text-white/80">You too can gl0w!</p>

        {notice && <p className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm">{notice}</p>}

        <h1 className="mt-10 text-3xl text-white">Scarica l'app Gl0w-up</h1>
        <p className="mt-2 text-white/80">Tutto il lavoro con la tua agenzia, in tasca.</p>

        <ul className="mt-6 space-y-3 text-sm">
          {[
            [ThumbsUp, "Approvi i lavori con un tocco"],
            [MessageSquareText, "Scrivi al team in un'unica chat"],
            [CalendarDays, "Appuntamenti, contratto e fatture sempre a portata"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof ThumbsUp;
            return (
              <li key={text as string} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><I className="h-4 w-4 text-arancione" /></span>
                {text as string}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 rounded-3xl bg-avorio p-6 text-prugna">
          {done || installed ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-viola" />
              <p><b className="text-viola">App installata.</b> Aprila dall'icona Gl0w-up sulla schermata Home del telefono.</p>
            </div>
          ) : canPrompt ? (
            <Button variant="accent" size="lg" className="w-full" onClick={async () => setDone(await install())}>
              <Download /> Installa l'app
            </Button>
          ) : platform === "ios" ? (
            <>
              <p className="mb-4 font-semibold text-viola">Su iPhone, da Safari:</p>
              <ol className="space-y-4 text-sm">
                <li className="flex items-center gap-3"><Step n={1} /><span>Tocca <Share className="mx-1 inline h-5 w-5 align-text-bottom text-viola" aria-label="Condividi" /> <b>Condividi</b> in basso</span></li>
                <li className="flex items-center gap-3"><Step n={2} /><span>Scegli <PlusSquare className="mx-1 inline h-5 w-5 align-text-bottom text-viola" /> <b>Aggiungi alla schermata Home</b></span></li>
                <li className="flex items-center gap-3"><Step n={3} /><span>Apri Gl0w-up dall'icona sul telefono</span></li>
              </ol>
            </>
          ) : platform === "android" ? (
            <>
              <p className="mb-4 font-semibold text-viola">Su Android, da Chrome:</p>
              <ol className="space-y-4 text-sm">
                <li className="flex items-center gap-3"><Step n={1} /><span>Tocca <MoreVertical className="mx-1 inline h-5 w-5 align-text-bottom text-viola" /> in alto a destra</span></li>
                <li className="flex items-center gap-3"><Step n={2} /><span>Scegli <b>Installa app</b> (o <b>Aggiungi a schermata Home</b>)</span></li>
                <li className="flex items-center gap-3"><Step n={3} /><span>Apri Gl0w-up dall'icona sul telefono</span></li>
              </ol>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-viola" />
              <p className="text-sm">
                L'app è pensata per il telefono. Apri <b className="text-viola">{window.location.host}</b> dal browser del tuo smartphone
                (Safari su iPhone, Chrome su Android) e installala da lì.
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-10 text-center text-sm text-white/70">
          Fai parte del team? <Link to="/accedi" className="font-semibold text-white underline">Accedi al pannello</Link>
        </div>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arancione text-xs font-semibold text-white">{n}</span>;
}
