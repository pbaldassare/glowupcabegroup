import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate, formatTime, romeDayKey } from "@/lib/utils";
import { downloadIcs, groupByDay, modeLabel, monthGrid, monthName, typeLabel } from "@/lib/calendar";
import type { Appointment } from "@/lib/types";

const weekdays = ["L", "M", "M", "G", "V", "S", "D"];

/** Calendario (mockup C8): vista Mese con i pallini e vista Elenco. Il cliente vede, non modifica. */
export function Calendar() {
  const today = romeDayKey(new Date().toISOString());
  const [view, setView] = useState<"mese" | "elenco">("mese");
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);
  const { data, loading } = useQuery(async () => {
    const { data } = await supabase.from("appointments").select("*").neq("status", "annullato").order("starts_at");
    const list = (data as Appointment[]) ?? [];
    const ids = [...new Set(list.flatMap((a) => a.team_user_ids ?? []))];
    const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    return { list, names: Object.fromEntries(((people as { id: string; full_name: string | null }[]) ?? []).map((p) => [p.id, p.full_name ?? ""])) };
  });
  const byDay = useMemo(() => groupByDay(data?.list ?? []), [data]);
  const upcoming = (data?.list ?? []).filter((a) => romeDayKey(a.starts_at) >= today);

  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-[1.6rem] leading-none">Calendario</h1>
        <div className="flex shrink-0 rounded-full border border-border bg-card p-1">
          {(["mese", "elenco"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold capitalize", view === v ? "bg-viola text-white" : "text-viola")}>{v}</button>
          ))}
        </div>
      </header>

      {loading ? <Spinner /> : view === "mese" ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => shift(-1)} aria-label="Mese precedente" className="p-2 text-violetto"><ChevronLeft /></button>
            <p className="text-lg font-semibold capitalize text-viola">{monthName(ym.y, ym.m)}</p>
            <button onClick={() => shift(1)} aria-label="Mese successivo" className="p-2 text-violetto"><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {weekdays.map((w, i) => <span key={i} className="text-sm font-medium text-violetto">{w}</span>)}
            {monthGrid(ym.y, ym.m).map((day, i) => {
              if (!day) return <span key={i} />;
              const has = byDay.has(day);
              const isSel = day === selected;
              return (
                <button key={day} onClick={() => setSelected(day)} className="flex justify-center" aria-label={formatDate(`${day}T12:00:00Z`, { day: "numeric", month: "long" })} aria-pressed={isSel}>
                  <span className={cn("relative flex h-11 w-11 items-center justify-center rounded-full text-lg", isSel ? "bg-viola font-semibold text-white" : day === today ? "border-2 border-viola font-semibold text-viola" : "text-viola")}>
                    {Number(day.slice(8))}
                    {has && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-arancione" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-5 text-sm text-violetto">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-arancione" /> Appuntamento</span>
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-viola" /> Oggi</span>
          </div>
          <h2 className="mb-3 mt-6 font-sans text-lg font-semibold first-letter:uppercase">{formatDate(`${selected}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</h2>
          {byDay.get(selected)?.length ? (
            <div className="space-y-3">{byDay.get(selected)!.map((a) => <AppointmentCard key={a.id} a={a} names={data!.names} />)}</div>
          ) : <p className="text-sm text-violetto">Nessun appuntamento in questo giorno.</p>}
        </>
      ) : !upcoming.length ? (
        <EmptyState title="Nessun appuntamento in programma" text="Per spostarne uno scrivici in Messaggi." />
      ) : (
        <div className="space-y-6">
          {[...groupByDay(upcoming).entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-3 font-sans text-lg font-semibold first-letter:uppercase">{formatDate(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}</h2>
              <div className="space-y-3">{list.map((a) => <AppointmentCard key={a.id} a={a} names={data!.names} />)}</div>
            </section>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-sm text-violetto">Per spostare un appuntamento scrivici in Messaggi.</p>
    </>
  );
}

function AppointmentCard({ a, names }: { a: Appointment; names: Record<string, string> }) {
  const people = (a.team_user_ids ?? []).map((id) => names[id]).filter(Boolean);
  return (
    <Card className="p-5">
      <div className="flex gap-4">
        <span className="w-1.5 shrink-0 rounded-full bg-arancione" />
        <div className="flex-1">
          <p className="eyebrow mb-1">{typeLabel[a.type]}{a.status === "da_confermare" ? " · da confermare" : ""}</p>
          <p className="text-lg font-semibold text-viola">{a.title}</p>
          <p className="mt-1 flex items-center gap-2 text-violetto"><Clock className="h-4 w-4" /> {formatTime(a.starts_at)} · {a.duration_min} min{modeLabel(a) ? ` · ${modeLabel(a)}` : ""}</p>
          {people.length > 0 && <p className="text-violetto">Con {people.join(" e ")}</p>}
          {a.notes && <p className="mt-1 text-sm text-prugna">{a.notes}</p>}
        </div>
      </div>
      <Button variant="accent" className="mt-4 w-full" onClick={() => downloadIcs(a)}><CalendarPlus /> Aggiungi al mio calendario</Button>
    </Card>
  );
}
