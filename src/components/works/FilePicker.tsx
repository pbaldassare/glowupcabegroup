import { useRef } from "react";
import { Upload, X } from "lucide-react";

/** Riquadro tratteggiato per scegliere i file (mockup T2), con anteprima delle immagini. */
export function FilePicker({ files, onChange, accept = "image/*,video/*,application/pdf" }: { files: File[]; onChange: (f: File[]) => void; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-3xl border-2 border-dashed border-violetto/50 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onChange([...files, ...Array.from(e.dataTransfer.files)]); }}
    >
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div key={i} className="relative h-24 w-24 overflow-hidden rounded-2xl bg-secondary">
            {f.type.startsWith("image/") ? (
              <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center p-2 text-center text-xs text-viola">{f.name}</span>
            )}
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Togli ${f.name}`} className="absolute right-1 top-1 rounded-full bg-prugna/70 p-1 text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => input.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border border-border text-sm text-viola hover:bg-secondary">
          <Upload className="h-5 w-5" /> Aggiungi
        </button>
      </div>
      <p className="mt-3 text-xs text-violetto">Immagini, video o PDF (fino a 100 MB l'uno). Puoi trascinarli qui.</p>
      <input ref={input} type="file" multiple hidden accept={accept} onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
    </div>
  );
}
