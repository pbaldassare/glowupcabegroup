import { useState } from "react";
import { FileText, Play } from "lucide-react";
import { fileName, isImage, isPdf, isVideo } from "@/lib/files";
import type { Pin } from "@/lib/works";
import { cn } from "@/lib/utils";

/**
 * Anteprima dei file di una versione con i pallini per scorrere (mockup C4).
 * Se ci sono note posizionate, le mostra sopra l'immagine.
 */
export function FileStage({ files, urls, pins = [], className }: { files: string[]; urls: Record<string, string>; pins?: Pin[]; className?: string }) {
  const [i, setI] = useState(0);
  if (!files.length) {
    return (
      <div className={cn("relative aspect-square overflow-hidden rounded-[2rem] bg-viola", className)}>
        <span className="absolute right-[6%] top-[6%] h-[44%] w-[44%] rounded-full bg-arancione" />
        <span className="absolute bottom-0 left-0 h-[37%] w-[58%] bg-lilla" />
        <span className="absolute -bottom-[20%] -right-[20%] h-[60%] w-[60%] rounded-full bg-avorio" />
      </div>
    );
  }
  const f = files[Math.min(i, files.length - 1)];
  const url = urls[f];
  const filePins = pins.map((p, n) => ({ ...p, n: n + 1 })).filter((p) => p.file === f);
  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[2rem] bg-prugna">
        {isImage(f) && url ? (
          <div className="relative">
            <img src={url} alt={fileName(f)} className="max-h-[70dvh] w-full object-contain" />
            {filePins.map((p) => (
              <span key={p.n} className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-arancione bg-avorio font-semibold text-viola shadow-lg" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                {p.n}
              </span>
            ))}
          </div>
        ) : isVideo(f) && url ? (
          <video src={url} controls playsInline className="max-h-[70dvh] w-full" />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center text-avorio">
            {isPdf(f) ? <FileText className="h-12 w-12 text-arancione" /> : <Play className="h-12 w-12 text-arancione" />}
            <span className="font-semibold">{fileName(f)}</span>
            <span className="text-sm text-avorio/70">Tocca per aprire</span>
          </a>
        )}
      </div>
      {files.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {files.map((x, n) => (
            <button key={x} onClick={() => setI(n)} aria-label={`File ${n + 1} di ${files.length}`} className={cn("h-2.5 rounded-full transition-all", n === i ? "w-10 bg-arancione" : "w-2.5 bg-violetto/30")} />
          ))}
        </div>
      )}
    </div>
  );
}
