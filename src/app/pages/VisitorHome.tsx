import { useState } from "react";
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
  const call = useQuery(async () =>
    (unwrap(await supabase.from("appointments").select("*").neq("status", "annullato").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1)) as Appointment[])[0] ?? null,
  );
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <>
      <PageHeader eyebrow="La tua richiesta" title={`Ciao${firstName ? `, ${firstName}` : ""}`} />
      {call.loading ? (
        <Spinner />
      ) : call.data ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <CalendarCheck2 className="h-6 w-6 text-arancione" />
            <Badge variant={call.data.status === "confermato" ? "success" : "outline"}>{call.data.status === "confermato" ? "Confermata" : "Da confermare"}</Badge>
          </div>
          <p className="text-lg font-semibold text-viola">Grazie. Ti aspettiamo {formatDate(call.data.starts_at, { weekday: "long", day: "numeric", month: "long" })} alle {formatTime(call.data.starts_at)}</p>
          <p className="mt-1 text-sm text-violetto">{call.data.mode === "in_sede" ? "In presenza, sede di Legnago" : "Al telefono"} · {call.data.duration_min} min</p>
          <p className="mt-4 text-sm text-violetto">Per spostarla scrivici in Messaggi.</p>
        </Card>
      ) : (
        <BookCall onBooked={call.reload} />
      )}
    </>
  );
}

function BookCall({ onBooked }: { onBooked: () => void }) {
  const [mode, setMode] = useState<"telefono" | "in_sede">("telefono");
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
