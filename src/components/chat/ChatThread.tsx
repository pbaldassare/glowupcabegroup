import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { workStatusLabel, type Message } from "@/lib/types";
import type { LinkedWork, Person } from "./useChat";

const TZ = "Europe/Rome";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

function dayLabel(iso: string) {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  const k = dayKey(iso);
  if (k === today) return "Oggi";
  if (k === yesterday) return "Ieri";
  return formatDate(iso, { weekday: "long", day: "numeric", month: "long" });
}

const isImage = (path: string) => /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(path);
const fileName = (path: string) => path.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");

/** "Gl0w-up" con lo 0 arancione, come nel mockup. */
const Brand = () => (
  <span className="font-semibold text-viola">Gl<span className="text-arancione">0</span>w-up</span>
);

type Props = {
  messages: Message[];
  people: Record<string, Person>;
  works: Record<string, LinkedWork>;
  urls: Record<string, string>;
  /** true = messaggio sul lato destro (viola) */
  isOwnSide: (m: Message) => boolean;
  /** Etichetta sopra i messaggi del lato sinistro */
  leftLabel: (author: Person | undefined) => ReactNode;
  /** Etichetta opzionale sopra i messaggi del lato destro (nel pannello: chi del team ha scritto) */
  rightLabel?: (author: Person | undefined) => ReactNode;
  workHref: (id: string) => string;
  emptyText: string;
  /** Spazio da lasciare sotto l'ultimo messaggio (es. barra di scrittura fissa) */
  bottomOffset?: number;
};

export function ChatThread({ messages, people, works, urls, isOwnSide, leftLabel, rightLabel, workHref, emptyText, bottomOffset = 0 }: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Aspetta che la pagina abbia disegnato i messaggi, poi va all'ultimo
    const t = setTimeout(() => bottom.current?.scrollIntoView({ block: "end" }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  if (messages.length === 0) return <p className="py-10 text-center text-sm text-violetto">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-1">
      {messages.map((m, i) => {
        const right = isOwnSide(m);
        const prev = messages[i - 1];
        const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
        const sameAuthorAsPrev = prev && !newDay && prev.author_id === m.author_id;
        const author = m.author_id ? people[m.author_id] : undefined;
        const work = m.work_id ? works[m.work_id] : undefined;
        return (
          <div key={m.id} className={cn("flex flex-col", right ? "items-end" : "items-start")}>
            {newDay && <p className="my-4 w-full text-center font-mono text-xs uppercase tracking-[0.2em] text-violetto">{dayLabel(m.created_at)}</p>}
            {!right && !sameAuthorAsPrev && <p className="mb-1.5 mt-2 text-sm">{leftLabel(author)}</p>}
            {right && rightLabel && !sameAuthorAsPrev && <p className="mb-1.5 mt-2 text-sm">{rightLabel(author)}</p>}
            <div
              className={cn(
                "max-w-[85%] rounded-3xl px-5 py-4 text-[15px] leading-relaxed",
                right ? "bg-viola text-white" : "border border-border bg-card text-prugna",
              )}
            >
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
              {work && (
                <Link to={workHref(work.id)} className={cn("mt-3 flex items-center gap-3 rounded-2xl border border-border p-3", right ? "bg-white/10" : "bg-avorio")}>
                  <WorkThumb />
                  <span className="flex-1">
                    <span className={cn("block font-semibold leading-tight", right ? "text-white" : "text-viola")}>{work.title}</span>
                    <Badge variant={work.status === "da_approvare" ? "accent" : work.status === "in_modifica" ? "lilla" : "success"} className="mt-1.5">
                      {workStatusLabel[work.status]}
                    </Badge>
                  </span>
                  <ChevronRight className="h-5 w-5 text-violetto" />
                </Link>
              )}
              {m.attachments?.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", m.body || work ? "mt-3" : "")}>
                  {m.attachments.map((p) =>
                    isImage(p) && urls[p] ? (
                      <a key={p} href={urls[p]} target="_blank" rel="noreferrer">
                        <img src={urls[p]} alt={fileName(p)} className="max-h-56 rounded-2xl object-cover" loading="lazy" />
                      </a>
                    ) : (
                      <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 rounded-2xl px-3 py-2 text-sm", right ? "bg-white/15" : "bg-secondary text-viola")}>
                        <FileText className="h-4 w-4" />
                        <span className="max-w-[12rem] truncate">{fileName(p)}</span>
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>
            <p className="mb-2 mt-1 px-2 text-xs text-violetto">{formatTime(m.created_at)}</p>
          </div>
        );
      })}
      <div ref={bottom} style={{ scrollMarginBottom: bottomOffset }} />
    </div>
  );
}

/** Miniatura del lavoro (in attesa delle anteprime vere). */
function WorkThumb() {
  return (
    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-viola">
      <span className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-arancione" />
      <span className="absolute bottom-0 left-0 h-6 w-8 bg-lilla" />
      <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full bg-avorio" />
    </span>
  );
}

export function TeamLabel({ author }: { author: Person | undefined }) {
  return (
    <>
      <span className="font-semibold text-viola">{author?.full_name ?? "Team"}</span>
      <span className="text-viola"> · </span>
      <Brand />
      {author?.job_title && <span className="text-violetto"> · {author.job_title}</span>}
    </>
  );
}
