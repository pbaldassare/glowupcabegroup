import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message, WorkStatus } from "@/lib/types";

export const BUCKET = "glowup-messaggi";

export type Person = { id: string; full_name: string | null; job_title: string | null; kind: string; team_role: string | null };
export type LinkedWork = { id: string; title: string; status: WorkStatus };

/** Cartella degli allegati: prima cartella = azienda (o visitatori/<id>), come vogliono le regole dei file. */
export function attachmentFolder(c: Conversation) {
  return c.company_id ? `${c.company_id}/${c.id}` : `visitatori/${c.visitor_user_id}/${c.id}`;
}

/** Messaggi di una conversazione: caricamento, tempo reale, invio con allegati, segna come letto. */
export function useChat(conversation: Conversation | null, meId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [works, setWorks] = useState<Record<string, LinkedWork>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const convId = conversation?.id;

  const hydrate = useCallback(async (list: Message[]) => {
    const authorIds = [...new Set(list.map((m) => m.author_id).filter(Boolean))] as string[];
    const workIds = [...new Set(list.map((m) => m.work_id).filter(Boolean))] as string[];
    const paths = [...new Set(list.flatMap((m) => m.attachments ?? []))];
    const [p, w, u] = await Promise.all([
      authorIds.length ? supabase.from("profiles").select("id, full_name, job_title, kind, team_role").in("id", authorIds) : Promise.resolve({ data: [] }),
      workIds.length ? supabase.from("works").select("id, title, status").in("id", workIds) : Promise.resolve({ data: [] }),
      paths.length ? supabase.storage.from(BUCKET).createSignedUrls(paths, 3600) : Promise.resolve({ data: [] }),
    ]);
    setPeople((prev) => ({ ...prev, ...Object.fromEntries(((p.data as Person[]) ?? []).map((x) => [x.id, x])) }));
    setWorks((prev) => ({ ...prev, ...Object.fromEntries(((w.data as LinkedWork[]) ?? []).map((x) => [x.id, x])) }));
    setUrls((prev) => ({ ...prev, ...Object.fromEntries(((u.data as { path: string | null; signedUrl: string }[]) ?? []).filter((x) => x.path).map((x) => [x.path!, x.signedUrl])) }));
  }, []);

  const markRead = useCallback(async () => {
    if (!convId || !meId) return;
    await supabase.from("conversation_reads").upsert({ conversation_id: convId, user_id: meId, last_read_at: new Date().toISOString() });
  }, [convId, meId]);

  useEffect(() => {
    if (!convId) return;
    let active = true;
    setLoading(true);
    setMessages([]);
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at").limit(300);
      if (!active) return;
      const list = (data as Message[]) ?? [];
      await hydrate(list);
      if (!active) return;
      setMessages(list);
      setLoading(false);
      markRead();
    })();

    const channel = supabase
      .channel(`chat:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "glowup", table: "messages", filter: `conversation_id=eq.${convId}` }, async (payload) => {
        const m = payload.new as Message;
        await hydrate([m]);
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        markRead();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [convId, hydrate, markRead]);

  const send = useCallback(
    async (body: string, files: File[], workId?: string | null) => {
      if (!conversation || !meId) throw new Error("Conversazione non disponibile");
      const attachments: string[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${attachmentFolder(conversation)}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined });
        if (error) throw new Error(`Allegato "${f.name}" non caricato`);
        attachments.push(path);
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversation.id, author_id: meId, body: body || null, attachments, work_id: workId ?? null })
        .select()
        .single();
      if (error) throw new Error("Messaggio non inviato");
      await hydrate([data as Message]);
      setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data as Message]));
    },
    [conversation, meId, hydrate],
  );

  return { messages, people, works, urls, loading, send };
}
