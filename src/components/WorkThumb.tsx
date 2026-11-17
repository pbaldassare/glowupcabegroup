import { cn } from "@/lib/utils";

/** Miniatura di un lavoro: l'immagine vera se c'è, altrimenti forme geometriche del brand. */
export function WorkThumb({ url, className, seed = 0 }: { url?: string | null; className?: string; seed?: number }) {
  if (url) return <img src={url} alt="" className={cn("h-16 w-16 shrink-0 rounded-2xl object-cover", className)} loading="lazy" />;
  const v = Math.abs(seed) % 3;
  return (
    <span className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl", v === 1 ? "bg-prugna" : "bg-viola", className)}>
      {v === 0 && (<><span className="absolute -right-2 -top-2 h-9 w-9 rounded-full bg-arancione" /><span className="absolute bottom-0 left-0 h-7 w-9 bg-lilla" /><span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-avorio" /></>)}
      {v === 1 && (<><span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-viola bg-avorio" /><span className="absolute inset-x-0 bottom-0 h-3 bg-arancione" /></>)}
      {v === 2 && (<><span className="absolute inset-2 rounded-lg bg-avorio" /><span className="absolute bottom-2 left-2 h-6 w-6 rounded-tr-full bg-arancione" /><span className="absolute right-3 top-3 h-5 w-3 bg-viola" /></>)}
    </span>
  );
}

export const hashSeed = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
