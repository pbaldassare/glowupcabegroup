import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_MB = 25;

/** Barra di scrittura come nel mockup: graffetta, testo, invio nel cerchio viola. */
export function Composer({ onSend, className, top }: { onSend: (body: string, files: File[]) => Promise<void>; className?: string; top?: ReactNode }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && files.length === 0) || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(body, files);
      setText("");
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Messaggio non inviato");
    } finally {
      setBusy(false);
    }
  }

  function pick(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    const tooBig = chosen.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) return setError(`"${tooBig.name}" supera ${MAX_MB} MB`);
    setFiles((f) => [...f, ...chosen].slice(0, 5));
  }

  return (
    <form onSubmit={submit} className={cn("space-y-2", className)}>
      {top}
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-viola">
              <span className="max-w-[10rem] truncate">{f.name}</span>
              <button type="button" aria-label={`Togli ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-full border border-border bg-avorio py-1.5 pl-4 pr-1.5 shadow-sm">
        <button type="button" onClick={() => input.current?.click()} aria-label="Allega un file" className="text-violetto hover:text-viola">
          <Paperclip className="h-6 w-6" />
        </button>
        <input ref={input} type="file" multiple hidden accept="image/*,video/*,application/pdf" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi un messaggio"
          aria-label="Messaggio"
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-prugna placeholder:text-violetto/70 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Invia"
          disabled={busy || (!text.trim() && files.length === 0)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-viola text-white transition-opacity disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
