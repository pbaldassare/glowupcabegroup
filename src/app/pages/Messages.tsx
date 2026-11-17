import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { PageHeader } from "@/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorText, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn, formatTime, formatDate } from "@/lib/utils";
import type { Message } from "@/lib/types";

type Author = { id: string; full_name: string | null; job_title: string | null; kind: string };

/** Unica conversazione con l'agenzia (per il cliente: della sua azienda; per il visitatore: la sua). */
export function Messages() {
  const { profile } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: conv } = await supabase.from("conversations").select("id").limit(1).maybeSingle();
      if (!active) return;
      if (!conv) return setLoading(false);
      setConversationId(conv.id);
      const [{ data: msgs }, { data: people }] = await Promise.all([
        supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at").limit(200),
        supabase.from("profiles").select("id, full_name, job_title, kind"),
      ]);
      if (!active) return;
      setMessages((msgs as Message[]) ?? []);
      setAuthors(Object.fromEntries(((people as Author[]) ?? []).map((p) => [p.id, p])));
      setLoading(false);
      await supabase.from("conversation_reads").upsert({ conversation_id: conv.id, user_id: profile!.id, last_read_at: new Date().toISOString() });
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  // Nuovi messaggi in tempo reale
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "glowup", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !conversationId) return;
    setError("");
    setText("");
    const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, author_id: profile!.id, body }).select().single();
    if (error) {
      setText(body);
      return setError(profile?.kind === "cliente" ? "Messaggio non inviato. Se il rapporto è chiuso, l'area è in sola lettura." : "Messaggio non inviato. Riprova.");
    }
    setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data as Message]));
  }

  return (
    <>
      <PageHeader title="Messaggi" />
      {loading ? (
        <Spinner />
      ) : !conversationId ? (
        <p className="text-sm text-violetto">La conversazione non è ancora disponibile.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.length === 0 && <p className="text-center text-sm text-violetto">Scrivici qui: risponde chi del team è disponibile.</p>}
          {messages.map((m, i) => {
            const mine = m.author_id === profile?.id;
            const author = m.author_id ? authors[m.author_id] : undefined;
            const newDay = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(m.created_at);
            return (
              <div key={m.id}>
                {newDay && <p className="my-2 text-center text-xs text-violetto">{formatDate(m.created_at)}</p>}
                <div className={cn("max-w-[85%] rounded-3xl px-4 py-3", mine ? "ml-auto rounded-br-md bg-viola text-white" : "rounded-bl-md bg-white text-prugna")}>
                  {!mine && <p className="mb-1 text-xs font-semibold text-arancione">{author?.full_name ?? "Gl0w-up"}{author?.job_title ? ` · ${author.job_title}` : ""}</p>}
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p className={cn("mt-1 text-right text-[10px]", mine ? "text-white/70" : "text-violetto")}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
          <ErrorText>{error}</ErrorText>
          <form onSubmit={send} className="sticky bottom-28 flex gap-2 bg-background pt-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio" aria-label="Messaggio" />
            <Button type="submit" size="icon" variant="accent" aria-label="Invia" disabled={!text.trim()}>
              <SendHorizontal />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
