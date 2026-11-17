import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, MessageSquareText, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState, ErrorText, Spinner } from "@/components/common";
import { AppointmentForm, type Option } from "@/admin/AppointmentForm";
import { api, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { KnowAnswers } from "@/lib/questionnaire";
import type { Appointment } from "@/lib/types";

type Visitor = { user_id: string; full_name: string; company_name: string | null; sector: string | null; email: string | null; phone: string | null; status: "nuovo" | "call_fissata" | "cliente" | "non_interessato"; company_id: string | null; created_at: string; marketing_consent: boolean };
type Slot = { id: string; team_user_id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number };

const statusLabel = { nuovo: "Nuovo", call_fissata: "Call fissata", cliente: "Diventato cliente", non_interessato: "Non interessato" };
const days = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];

/** Richieste dei visitatori: il commerciale fissa le call, l'amministratore segna l'esito e converte in cliente. */
export function Requests() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.team_role === "amministratore";
  const [tab, setTab] = useState<"aperte" | "tutte">("aperte");
  const [editing, setEditing] = useState<(Partial<Appointment> & { visitorName?: string }) | null>(null);
  const [error, setError] = useState("");

  const q = useQuery(async () => {
    const [v, a, qs, t] = await Promise.all([
      supabase.from("visitors").select("*").order("created_at", { ascending: false }),
      supabase.from("appointments").select("*").not("visitor_user_id", "is", null).neq("status", "annullato").order("starts_at", { ascending: false }),
      supabase.from("questionnaires").select("user_id, answers, submitted_at").eq("kind", "conoscitivo"),
      supabase.from("profiles").select("id, full_name, team_role").eq("kind", "team").eq("active", true),
    ]);
    return {
      visitors: (v.data as Visitor[]) ?? [],
      calls: (a.data as Appointment[]) ?? [],
      answers: Object.fromEntries(((qs.data as { user_id: string; answers: KnowAnswers }[]) ?? []).map((x) => [x.user_id, x.answers])) as Record<string, KnowAnswers>,
      team: ((t.data as { id: string; full_name: string | null; team_role: string }[]) ?? []),
    };
  });

  if (q.loading) return <Spinner />;
  const { visitors, calls, answers, team } = q.data!;
  const list = visitors.filter((v) => tab === "tutte" || v.status === "nuovo" || v.status === "call_fissata");
  const teamOptions: Option[] = team.map((t) => ({ id: t.id, name: t.full_name ?? "—" }));

  async function setOutcome(v: Visitor, status: Visitor["status"]) {
    const { error } = await supabase.from("visitors").update({ status }).eq("user_id", v.user_id);
    if (error) setError("Esito non salvato"); else q.reload();
  }

  async function convert(v: Visitor) {
    if (!window.confirm(`Trasformare ${v.full_name} in cliente? Viene creata l'azienda "${v.company_name ?? v.full_name}" e il suo account diventa account cliente.`)) return;
    try {
      const r = await api<{ company_id: string }>("convert-visitor", { visitor_user_id: v.user_id });
      navigate(`/admin/clienti/${r.company_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversione non riuscita");
    }
  }

  async function writeTo(v: Visitor) {
    const { data } = await supabase.from("conversations").select("id").eq("visitor_user_id", v.user_id).maybeSingle();
    if (data) navigate(`/admin/messaggi/${data.id}`);
  }

  return (
    <>
      <h1 className="mb-6 text-4xl">Richieste visitatori</h1>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-6 2xl:grid-cols-[1fr_26rem]">
        <div>
          <div className="mb-4 flex gap-2">
            {(["aperte", "tutte"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-4 py-2 text-sm capitalize", tab === k ? "bg-viola text-white" : "border border-border text-viola")}>{k}</button>
            ))}
          </div>
          {!list.length ? <EmptyState title="Nessuna richiesta" text="Quando un visitatore compila il questionario o prenota una call, lo trovi qui." /> : (
            <div className="space-y-4">
              {list.map((v) => {
                const call = calls.find((c) => c.visitor_user_id === v.user_id);
                const a = answers[v.user_id];
                return (
                  <Card key={v.user_id} className="p-5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-viola">{v.full_name}{v.company_name ? ` · ${v.company_name}` : ""}</p>
                        <p className="text-sm text-violetto">{[v.sector ?? a?.settore, v.email, v.phone ?? a?.telefono].filter(Boolean).join(" · ")}</p>
                      </div>
                      <Badge variant={v.status === "nuovo" ? "accent" : v.status === "call_fissata" ? "lilla" : v.status === "cliente" ? "success" : "outline"}>{statusLabel[v.status]}</Badge>
                    </div>
                    {a ? (
                      <div className="mb-3 space-y-2 text-sm">
                        {!!a.bisogni?.length && <div className="flex flex-wrap gap-1.5">{a.bisogni.map((b) => <Badge key={b} variant="outline">{b}</Badge>)}</div>}
                        <p className="text-violetto">Preferisce {a.modalita === "in_sede" ? "incontrarci in sede" : "sentirci al telefono"}{a.note ? ` · “${a.note}”` : ""}</p>
                      </div>
                    ) : <p className="mb-3 text-sm text-violetto">Questionario non ancora compilato.</p>}
                    {call ? (
                      <p className="mb-4 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-viola">
                        <CalendarClock className="h-4 w-4" />
                        Call {formatDate(call.starts_at, { weekday: "short", day: "numeric", month: "short" })} alle {formatTime(call.starts_at)} · {call.mode === "in_sede" ? "in sede" : "al telefono"} · <b>{call.status === "confermato" ? "confermata" : "da confermare"}</b>
                      </p>
                    ) : <p className="mb-4 text-sm text-violetto">Nessuna call prenotata.</p>}
                    <div className="flex flex-wrap gap-2">
                      {call && <Button size="sm" variant={call.status === "da_confermare" ? "accent" : "outline"} onClick={() => setEditing({ ...call, visitorName: v.full_name })}>{call.status === "da_confermare" ? "Conferma o sposta la call" : "Sposta la call"}</Button>}
                      <Button size="sm" variant="outline" onClick={() => writeTo(v)}><MessageSquareText /> Messaggi</Button>
                      {isAdmin && v.status !== "cliente" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => convert(v)}><UserCheck /> Diventa cliente</Button>
                          {v.status !== "non_interessato" && <Button size="sm" variant="ghost" onClick={() => setOutcome(v, "non_interessato")}><UserX /> Non interessato</Button>}
                        </>
                      )}
                      {isAdmin && v.status === "cliente" && v.company_id && <Button size="sm" variant="outline" onClick={() => navigate(`/admin/clienti/${v.company_id}`)}>Apri la scheda cliente</Button>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <Availability team={team} meId={profile!.id} isAdmin={isAdmin} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && <AppointmentForm initial={editing} companies={[]} team={teamOptions} visitorName={editing.visitorName} onDone={() => { setEditing(null); q.reload(); }} />}
      </Modal>
    </>
  );
}

/** Fasce orarie prenotabili dai visitatori (lun–ven), per commerciale. */
function Availability({ team, meId, isAdmin }: { team: { id: string; full_name: string | null; team_role: string }[]; meId: string; isAdmin: boolean }) {
  const sales = team.filter((t) => t.team_role === "commerciale");
  const [owner, setOwner] = useState(isAdmin ? sales[0]?.id ?? meId : meId);
  const [f, setF] = useState({ weekday: "1", start: "08:00", end: "12:00", slot: "30" });
  const [error, setError] = useState("");
  const q = useQuery(async () => ((await supabase.from("availability").select("*").eq("team_user_id", owner).order("weekday").order("start_time")).data as Slot[]) ?? [], [owner]);

  async function add() {
    const { error } = await supabase.from("availability").insert({ team_user_id: owner, weekday: Number(f.weekday), start_time: f.start, end_time: f.end, slot_minutes: Number(f.slot) });
    if (error) setError("Fascia non salvata: controlla gli orari"); else { setError(""); q.reload(); }
  }
  async function remove(id: string) {
    await supabase.from("availability").delete().eq("id", id);
    q.reload();
  }

  return (
    <Card className="h-fit p-6">
      <h2 className="mb-1 font-sans text-xl font-semibold">Fasce prenotabili</h2>
      <p className="mb-4 text-sm text-violetto">Gli orari in cui i visitatori possono prenotare la call conoscitiva.</p>
      {isAdmin && sales.length > 0 && (
        <div className="mb-4"><Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Commerciale">{sales.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select></div>
      )}
      {q.loading ? <Spinner /> : !q.data?.length ? <p className="mb-4 text-sm text-violetto">Nessuna fascia: i visitatori non vedono orari liberi.</p> : (
        <ul className="mb-4 divide-y divide-border">
          {q.data.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span><b className="text-viola">{days[s.weekday]}</b> {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · slot {s.slot_minutes} min</span>
              <button onClick={() => remove(s.id)} aria-label="Togli fascia" className="text-violetto"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Select value={f.weekday} onChange={(e) => setF({ ...f, weekday: e.target.value })} aria-label="Giorno">{days.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</Select>
        <Select value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })} aria-label="Durata slot">{[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} min</option>)}</Select>
        <Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} aria-label="Dalle" />
        <Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} aria-label="Alle" />
      </div>
      <ErrorText>{error}</ErrorText>
      <Button variant="outline" className="mt-3 w-full" onClick={add}><Plus /> Aggiungi fascia</Button>
    </Card>
  );
}
