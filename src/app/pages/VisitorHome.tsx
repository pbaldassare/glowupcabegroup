import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { SKIP_KEY } from "./VisitorQuestionnaire";
import { CalendarCheck2, Phone, Building2 } from "lucide-react";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorText, Spinner } from "@/components/common";
import { api, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

type Slot = { starts_at: string; minutes: number };

/** Visitatore: la sua richiesta di call oppure la prenotazione di uno slot libero. */
export function VisitorHome() {
  const { profile } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const call = useQuery(async () => {
    const [a, qn] = await Promise.all([
      supabase.from("appointments").select("*").neq("status", "annullato").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1),
      supabase.from("questionnaires").select("id, answers").eq("kind", "conoscitivo").limit(1).maybeSingle(),
    ]);
    return {
      appointment: (unwrap(a) as Appointment[])[0] ?? null,
      questionnaire: qn.data as { id: string; answers: { modalita?: "telefono" | "in_sede" } } | null,
    };
  });
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  let skipped = false;
  try { skipped = localStorage.getItem(SKIP_KEY) === "1"; } catch { /* ignora */ }
  const preferred = (location.state as { mode?: "telefono" | "in_sede" } | null)?.mode ?? call.data?.questionnaire?.answers.modalita;

  // Primo ingresso: prima il questionario (si può rimandare)
  if (!call.loading && call.data && !call.data.appointment && !call.data.questionnaire && !skipped) return <Navigate to="/questionario" replace />;

  return (
    <>
      <PageHeader eyebrow="La tua richiesta" title={`Ciao${firstName ? `, ${firstName}` : ""}`} />
      {call.loading ? (
        <Spinner />
      ) : call.data?.appointment ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <CalendarCheck2 className="h-6 w-6 text-arancione" />
            <Badge variant={call.data.appointment.status === "confermato" ? "success" : "outline"}>{call.data.appointment.status === "confermato" ? "Confermata" : "Da confermare"}</Badge>
          </div>
          <p className="text-lg font-semibold text-viola">Grazie. Ti aspettiamo {formatDate(call.data.appointment.starts_at, { weekday: "long", day: "numeric", month: "long" })} alle {formatTime(call.data.appointment.starts_at)}</p>
          <p className="mt-1 text-sm text-violetto">{call.data.appointment.mode === "in_sede" ? "In presenza, sede di Legnago" : "Al telefono"} · {call.data.appointment.duration_min} min</p>
          <p className="mt-4 text-sm text-violetto">Per spostarla scrivici in Messaggi.</p>
        </Card>
      ) : !call.data?.questionnaire ? (
        <div className="space-y-4">
          <p className="text-violetto">Prima della call ci servono due informazioni su di te e su cosa ti serve.</p>
          <Button asChild variant="accent" size="lg" className="w-full"><Link to="/questionario">Prenota un appuntamento</Link></Button>
          <Button asChild variant="outline" className="w-full"><Link to="/consigli">Leggi i nostri consigli</Link></Button>
        </div>
      ) : (
        <>
          {params.get("fatto") && <p className="mb-4 rounded-3xl bg-secondary p-4 font-semibold text-viola">Grazie. Ora scegli quando incontrarci.</p>}
          <BookCall onBooked={call.reload} preferred={preferred} />
        </>
      )}
    </>
  );
}

function BookCall({ onBooked, preferred }: { onBooked: () => void; preferred?: "telefono" | "in_sede" }) {
  const [mode, setMode] = useState<"telefono" | "in_sede">(preferred ?? "telefono");
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slots = useQuery(async () => (await api<{ slots: Slot[] }>("slots", { days: 14 })).slots);

  const byDay = new Map<string, Slot[]>();
  for (const s of slots.data ?? []) {
    const key = formatDate(s.starts_at, { weekday: "short", day: "numeric", month: "short" });
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const days = [...byDay.keys()];
  const currentDay = day ?? days[0] ?? null;

  async function book() {
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      await api("book-call", { starts_at: chosen, mode });
      onBooked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prenotazione non riuscita");
      slots.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-violetto">Prenota una call conoscitiva con noi: dura da 10 a 30 minuti.</p>
      <div className="grid grid-cols-2 gap-3">
        {([["telefono", "Al telefono", Phone], ["in_sede", "In sede a Legnago", Building2]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setMode(key)} className={cn("flex flex-col items-start gap-2 rounded-3xl border p-4 text-left", mode === key ? "border-viola bg-viola text-white" : "border-border text-viola")}>
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>
      {slots.loading ? (
        <Spinner />
      ) : slots.error ? (
        <ErrorText>Non riusciamo a caricare gli orari: {slots.error}</ErrorText>
      ) : days.length === 0 ? (
        <p className="text-sm text-violetto">Al momento non ci sono orari liberi. Scrivici in Messaggi e ti richiamiamo.</p>
      ) : (
        <>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {days.map((d) => (
              <button key={d} onClick={() => { setDay(d); setChosen(null); }} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm capitalize", d === currentDay ? "border-arancione bg-arancione text-white" : "border-border text-viola")}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(byDay.get(currentDay!) ?? []).map((s) => (
              <button key={s.starts_at} onClick={() => setChosen(s.starts_at)} className={cn("rounded-2xl border py-3 text-sm font-medium", chosen === s.starts_at ? "border-viola bg-viola text-white" : "border-border text-viola")}>
                {formatTime(s.starts_at)}
              </button>
            ))}
          </div>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button variant="accent" className="w-full" disabled={!chosen || busy} onClick={book}>{busy ? "Prenotazione…" : "Prenota la call"}</Button>
    </div>
  );
}
