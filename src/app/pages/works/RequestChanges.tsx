import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/BackButton";
import { ErrorText, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fileName, isImage } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { Pin } from "@/lib/works";
import { useWork } from "./useWork";

/** Chiedo modifiche (mockup C5): tocchi l'immagine, scrivi la nota per ogni punto, più un commento generale. */
export function RequestChanges() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const q = useWork(id);
  const [pins, setPins] = useState<Pin[]>([]);
  const [comment, setComment] = useState("");
  const [fileIdx, setFileIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Dopo ogni tocco sull'immagine il cursore va sulla nuova nota
  const count = pins.length;
  const prev = useRef(0);
  useEffect(() => {
    if (count > prev.current) inputs.current[count - 1]?.focus();
    prev.current = count;
  }, [count]);

  if (q.loading) return <div className="p-6"><Spinner /></div>;
  if (!q.data) return <div className="p-6"><ErrorText>{q.error}</ErrorText></div>;
  const { work, versions, urls } = q.data;
  const current = versions[0];
  const images = (current?.files ?? []).filter(isImage);
  const file = images[Math.min(fileIdx, images.length - 1)];

  function addPin(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    setPins((p) => [...p, { file, x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), text: "" }]);
  }

  async function submit() {
    const clean = pins.filter((p) => p.text.trim()).map((p) => ({ ...p, text: p.text.trim() }));
    if (!clean.length && !comment.trim()) return setError("Tocca un punto dell'immagine o scrivi un commento.");
    setBusy(true);
    setError("");
    const { error } = await supabase.from("feedback").insert({
      version_id: current.id, work_id: work.id, company_id: work.company_id, author_id: profile!.id,
      outcome: "modifiche", comment: comment.trim() || null, pins: clean,
    });
    setBusy(false);
    if (error) return setError("Invio non riuscito. Riprova.");
    navigate(`/lavori/${work.id}`, { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="mb-4 flex items-center gap-4">
        <BackButton to={`/lavori/${work.id}`} />
        <h1 className="font-sans text-2xl font-semibold">Chiedo modifiche</h1>
      </div>

      {file ? (
        <>
          <p className="mb-3 text-violetto">Tocca l'immagine nel punto da cambiare.</p>
          <div className="relative cursor-crosshair overflow-hidden rounded-[2rem] bg-prugna" onClick={addPin}>
            <img src={urls[file]} alt={fileName(file)} className="w-full select-none" draggable={false} />
            {pins.map((p, i) => p.file === file && (
              <span key={i} className="pointer-events-none absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-arancione bg-avorio text-lg font-bold text-viola shadow-lg" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                {i + 1}
              </span>
            ))}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((f, i) => (
                <button key={f} onClick={() => setFileIdx(i)} className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2", i === fileIdx ? "border-arancione" : "border-transparent")}>
                  <img src={urls[f]} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mb-3 text-violetto">Questo lavoro non ha immagini: scrivici cosa cambiare nel commento.</p>
      )}

      <div className="mt-4 space-y-3">
        {pins.map((p, i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-arancione font-bold text-viola">{i + 1}</span>
            <input
              ref={(el) => { inputs.current[i] = el; }}
              value={p.text}
              onChange={(e) => setPins(pins.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder="Cosa cambieresti qui?"
              aria-label={`Nota ${i + 1}`}
              className="min-w-0 flex-1 bg-transparent text-prugna placeholder:text-violetto/70 focus:outline-none"
            />
            {p.text ? <Pencil className="h-5 w-5 shrink-0 text-violetto" /> : null}
            <button onClick={() => setPins(pins.filter((_, j) => j !== i))} aria-label={`Togli la nota ${i + 1}`} className="text-violetto"><X className="h-5 w-5" /></button>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="commento" className="font-semibold text-viola">Commento generale</Label>
        <Textarea id="commento" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Scrivi qui se vuoi aggiungere altro" />
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="mt-auto pt-6">
        <Button variant="accent" size="lg" className="w-full rounded-3xl text-lg" onClick={submit} disabled={busy}>
          <Send className="!size-5" /> {busy ? "Invio…" : "Invia le modifiche"}
        </Button>
      </div>
    </div>
  );
}
