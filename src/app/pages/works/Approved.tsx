import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { WorkThumb, hashSeed } from "@/components/WorkThumb";
import { isImage } from "@/lib/files";
import { useWork } from "./useWork";

/** Lavoro approvato (mockup C6): l'effetto "glow" arancione. */
export function Approved() {
  const { id } = useParams();
  const q = useWork(id);
  const work = q.data?.work;
  const v = q.data?.versions[0];
  const img = v?.files.find(isImage);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div aria-hidden className="glow-bg pointer-events-none absolute inset-0" />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-10 flex h-64 w-64 items-center justify-center">
          <span className="glow-ring absolute h-56 w-56 rounded-full bg-arancione/20" />
          <span className="glow-ring absolute h-44 w-44 rounded-full bg-arancione/30 [animation-delay:400ms]" />
          <span className="relative flex h-36 w-36 items-center justify-center rounded-full bg-arancione shadow-[0_0_60px_rgba(255,132,39,0.6)]">
            <Check className="h-16 w-16 text-viola" strokeWidth={3} />
          </span>
        </div>
        <h1 className="text-[1.9rem] leading-tight">Lavoro approvato.</h1>
        <p className="mt-2 text-xl font-semibold text-viola">Grazie!</p>
        <p className="mt-4 text-violetto">Lo trovi nell'archivio di Il mio spazio</p>
        {work && (
          <Card className="mt-8 flex w-full items-center gap-4 p-4 text-left">
            <WorkThumb url={img ? q.data?.urls[img] : null} seed={hashSeed(work.id)} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-viola">{work.title}</p>
              <p className="text-sm text-violetto">{[work.projects?.title ?? work.kind, v && `Versione ${v.number}`].filter(Boolean).join(" · ")}</p>
            </div>
            <WorkStatusBadge status="approvato" />
          </Card>
        )}
      </div>
      <div className="relative space-y-4 pt-8 text-center">
        <Button asChild variant="accent" size="lg" className="w-full rounded-3xl text-lg"><Link to="/lavori">Torna ai lavori</Link></Button>
        <Link to="/il-mio-spazio/archivio" className="inline-block font-semibold text-viola underline underline-offset-4">Apri l'archivio</Link>
      </div>
    </div>
  );
}
