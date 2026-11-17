import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, UserPlus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/common";
import { ChatThread, TeamLabel } from "@/components/chat/ChatThread";
import { Composer } from "@/components/chat/Composer";
import { useChat, type Person } from "@/components/chat/useChat";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn, formatTime } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

type Row = Conversation & {
  companies: { legal_name: string; trade_name: string | null; company_team: { team_user_id: string }[] } | null;
  visitors: { full_name: string; company_name: string | null } | null;
};
type Filter = "tutte" | "miei" | "visitatori";

const rowName = (r: Row) => r.companies?.trade_name ?? r.companies?.legal_name ?? r.visitors?.full_name ?? "Conversazione";
const initials = (s: string | null | undefined) => (s ?? "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** Casella unica del team: elenco conversazioni + chat; referenti assegnati a ogni cliente. */
export function AdminMessages() {
  const { profile } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [team, setTeam] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("tutte");
  const role = profile?.team_role;
  const isAdmin = role === "amministratore";

  async function load() {
    const [c, r, t] = await Promise.all([
      supabase
        .from("conversations")
        .select("*, companies(legal_name, trade_name, company_team(team_user_id)), visitors(full_name, company_name)")
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase.from("conversation_reads").select("conversation_id, last_read_at").eq("user_id", profile!.id),
      supabase.from("profiles").select("id, full_name, job_title, kind, team_role").eq("kind", "team").eq("active", true),
    ]);
    setRows((c.data as unknown as Row[]) ?? []);
    setReads(Object.fromEntries(((r.data as { conversation_id: string; last_read_at: string }[]) ?? []).map((x) => [x.conversation_id, x.last_read_at])));
    setTeam(Object.fromEntries(((t.data as Person[]) ?? []).map((p) => [p.id, p])));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "glowup", table: "messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = (r: Row) =>
    !!r.last_message_at && r.last_author_id !== profile?.id && !(r.last_author_id && team[r.last_author_id]) && (!reads[r.id] || reads[r.id] < r.last_message_at);

  const visible = useMemo(
    () =>
      rows.filter((r) =>
        filter === "visitatori" ? !!r.visitor_user_id
          : filter === "miei" ? !!r.companies?.company_team.some((t) => t.team_user_id === profile?.id)
          : true,
      ),
    [rows, filter, profile?.id],
  );
  const current = rows.find((r) => r.id === id) ?? null;
  const canSeeVisitors = role !== "operativo";

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <h1 className={cn("mb-6 text-4xl", id && "hidden lg:block")}>Messaggi</h1>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_1fr]">
        {/* Elenco conversazioni */}
        <Card className={cn("flex min-h-0 flex-col overflow-hidden", id && "hidden lg:flex")}>
          <div className="flex gap-1 border-b border-border p-3">
            {([["tutte", "Tutte"], ["miei", "I miei clienti"], ...(canSeeVisitors ? [["visitatori", "Visitatori"]] : [])] as [Filter, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full px-3 py-1.5 text-sm", filter === k ? "bg-viola text-white" : "text-viola hover:bg-secondary")}>
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6"><Spinner /></div>
            ) : visible.length === 0 ? (
              <p className="p-6 text-sm text-violetto">Nessuna conversazione.</p>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((r) => {
                  const u = unread(r);
                  const refs = r.companies?.company_team ?? [];
                  return (
                    <li key={r.id}>
                      <Link to={`/admin/messaggi/${r.id}`} className={cn("flex gap-3 px-4 py-3 hover:bg-secondary/60", r.id === id && "bg-secondary")}>
                        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", r.visitor_user_id ? "bg-arancione" : "bg-viola")}>
                          {initials(rowName(r))}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-viola", u ? "font-bold" : "font-semibold")}>{rowName(r)}</span>
                            <span className="shrink-0 font-mono text-xs text-violetto">{r.last_message_at ? formatTime(r.last_message_at) : ""}</span>
                          </span>
                          <span className={cn("block truncate text-sm", u ? "font-medium text-prugna" : "text-violetto")}>
                            {r.last_message_preview ?? (r.visitor_user_id ? "Visitatore" : "Nessun messaggio")}
                          </span>
                          <span className="mt-1 flex items-center gap-1">
                            {refs.map((t) => (
                              <span key={t.team_user_id} title={team[t.team_user_id]?.full_name ?? ""} className="flex h-5 w-5 items-center justify-center rounded-full bg-lilla text-[10px] font-semibold text-white">
                                {initials(team[t.team_user_id]?.full_name)}
                              </span>
                            ))}
                            {u && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-arancione" aria-label="Non letto" />}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Chat */}
        <Card className={cn("flex min-h-0 flex-col overflow-hidden", !id && "hidden lg:flex")}>
          {current ? (
            <Thread
              key={current.id}
              row={current}
              team={team}
              meId={profile!.id}
              isAdmin={isAdmin}
              canWrite={current.company_id ? role === "amministratore" || role === "operativo" : isAdmin}
              onBack={() => navigate("/admin/messaggi")}
              onChanged={load}
            />
          ) : (
            <div className="m-auto p-8"><EmptyState title="Scegli una conversazione" text="Le conversazioni con messaggi non letti hanno il pallino arancione." /></div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Thread({ row, team, meId, isAdmin, canWrite, onBack, onChanged }: {
  row: Row; team: Record<string, Person>; meId: string; isAdmin: boolean; canWrite: boolean; onBack: () => void; onChanged: () => void;
}) {
  const chat = useChat(row, meId);
  const [editing, setEditing] = useState(false);
  const refs = row.companies?.company_team.map((t) => t.team_user_id) ?? [];
  const clientName = rowName(row);

  // Il messaggio appena letto aggiorna il pallino nell'elenco
  useEffect(() => {
    if (!chat.loading) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.loading, chat.messages.length]);

  async function toggleRef(userId: string) {
    if (!row.company_id) return;
    if (refs.includes(userId)) await supabase.from("company_team").delete().eq("company_id", row.company_id).eq("team_user_id", userId);
    else await supabase.from("company_team").insert({ company_id: row.company_id, team_user_id: userId });
    onChanged();
  }

  return (
    <>
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden" aria-label="Torna all'elenco"><ArrowLeft className="h-5 w-5 text-viola" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl text-viola">{clientName}</p>
            <p className="text-xs text-violetto">
              {row.visitor_user_id ? `Visitatore${row.visitors?.company_name ? ` · ${row.visitors.company_name}` : ""}` : row.companies?.legal_name}
            </p>
          </div>
        </div>
        {row.company_id && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-violetto">Referenti:</span>
            {refs.length === 0 && <span className="text-violetto/80">nessuno (gli avvisi vanno a tutto il team)</span>}
            {refs.map((uid) => (
              <span key={uid} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-viola">
                {team[uid]?.full_name ?? "—"}{team[uid]?.job_title ? ` · ${team[uid].job_title}` : ""}
                {isAdmin && editing && <button onClick={() => toggleRef(uid)} aria-label="Togli referente"><X className="h-3.5 w-3.5" /></button>}
              </span>
            ))}
            {isAdmin && (
              <button onClick={() => setEditing((e) => !e)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-viola hover:bg-secondary">
                <UserPlus className="h-3.5 w-3.5" /> {editing ? "Fatto" : "Modifica"}
              </button>
            )}
          </div>
        )}
        {isAdmin && editing && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(team).filter((p) => !refs.includes(p.id)).map((p) => (
              <button key={p.id} onClick={() => toggleRef(p.id)} className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-violetto hover:bg-secondary">
                + {p.full_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {chat.loading ? (
          <div className="p-6"><Spinner /></div>
        ) : (
          <ChatThread
            messages={chat.messages}
            people={chat.people}
            works={chat.works}
            urls={chat.urls}
            isOwnSide={(m) => !!m.author_id && (chat.people[m.author_id]?.kind === "team" || !!team[m.author_id])}
            leftLabel={(a) => (
              <>
                <span className="font-semibold text-viola">{a?.full_name ?? clientName}</span>
                <span className="text-violetto"> · {clientName}</span>
              </>
            )}
            rightLabel={(a) => <TeamLabel author={a} />}
            workHref={() => "/admin/lavori"}
            emptyText="Ancora nessun messaggio."
          />
        )}
      </div>

      <div className="border-t border-border p-4">
        {canWrite ? (
          <Composer onSend={chat.send} />
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-violetto"><Lock className="h-4 w-4" /> Puoi leggere questa conversazione, ma non rispondere.</p>
        )}
      </div>
    </>
  );
}
