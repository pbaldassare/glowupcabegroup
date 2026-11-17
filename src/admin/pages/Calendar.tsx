import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Spinner } from "@/components/common";
import { AppointmentForm, type Option } from "@/admin/AppointmentForm";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate, formatTime, romeDayKey, romeToISO } from "@/lib/utils";
import { groupByDay, modeLabel, monthName, typeLabel } from "@/lib/calendar";
import type { Appointment } from "@/lib/types";

type Row = Appointment & { companies: { legal_name: string; trade_name: string | null } | null; visitors: { full_name: string; company_name: string | null } | null };

/** Calendario del team: vista d'insieme di tutti i clienti e delle call dei visitatori. */
export function AdminCalendar() {
  const today = romeDayKey(new Date().toISOString());
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [filter, setFilter] = useState<"tutti" | "da_confermare">("tutti");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const q = useQuery(async () => {
    const from = romeToISO(`${ym.y}-${String(ym.m + 1).padStart(2, "0")}-01`, "00:00");
    const toD = new Date(Date.UTC(ym.y, ym.m + 1, 1));
    const to = romeToISO(toD.toISOString().slice(0, 10), "00:00");
    const [a, c, t] = await Promise.all([
      supabase.from("appointments").select("*, companies(legal_name, trade_name), visitors(full_name, company_name)").gte("starts_at", from).lt("starts_at", to).order("starts_at"),
      supabase.from("companies").select("id, legal_name, trade_name").eq("status", "attivo").order("legal_name"),
      supabase.from("profiles").select("id, full_name").eq("kind", "team").eq("active", true),
    ]);
    return {
      list: (a.data as unknown as Row[]) ?? [],
      companies: ((c.data as { id: string; legal_name: string; trade_name: string | null }[]) ?? []).map((x) => ({ id: x.id, name: x.trade_name ?? x.legal_name })) as Option[],
      team: ((t.data as { id: string; full_name: string | null }[]) ?? []).map((x) => ({ id: x.id, name: x.full_name ?? "—" })) as Option[],
    };
  }, [ym.y, ym.m]);

  const list = (q.data?.list ?? []).filter((a) => filter === "tutti" || a.status === "da_confermare");
  const days = useMemo(() => groupByDay(list), [list]);
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const who = (a: Row) => a.companies ? (a.companies.trade_name ?? a.companies.legal_name) : `${a.visitors?.full_name ?? "Visitatore"}${a.visitors?.company_name ? ` · ${a.visitors.company_name}` : ""}`;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Calendario</h1>
        <Button variant="accent" onClick={() => setEditing({})}><Plus /> Nuovo appuntamento</Button>
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} aria-label="Mese precedente" className="rounded-full p-2 text-violetto hover:bg-secondary"><ChevronLeft /></button>
          <span className="w-44 text-center text-lg font-semibold capitalize text-viola">{monthName(ym.y, ym.m)}</span>
          <button onClick={() => shift(1)} aria-label="Mese successivo" className="rounded-full p-2 text-violetto hover:bg-secondary"><ChevronRight /></button>
        </div>
        {(["tutti", "da_confermare"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full px-4 py-2 text-sm", filter === k ? "bg-viola text-white" : "border border-border text-viola")}>
            {k === "tutti" ? "Tutti" : `Da confermare ${(q.data?.list ?? []).filter((a) => a.status === "da_confermare").length}`}
          </button>
        ))}
      </div>

      {q.loading ? <Spinner /> : !days.size ? (
        <EmptyState title="Nessun appuntamento in questo mese" />
      ) : (
        <div className="space-y-6">
          {[...days.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className={cn("mb-3 font-sans text-lg font-semibold first-letter:uppercase", day === today && "text-arancione")}>
                {formatDate(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}{day === today ? " · oggi" : ""}
              </h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((a) => (
                  <button key={a.id} onClick={() => setEditing(a)} className="text-left">
                    <Card className={cn("flex gap-4 p-4 hover:border-violetto", a.status === "annullato" && "opacity-50")}>
                      <span className={cn("w-1.5 shrink-0 rounded-full", a.status === "da_confermare" ? "bg-lilla" : "bg-arancione")} />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-violetto">{formatTime(a.starts_at)} · {a.duration_min} min</p>
                        <p className={cn("font-semibold text-viola", a.status === "annullato" && "line-through")}>{a.title}</p>
                        <p className="truncate text-sm text-violetto">{who(a)} · {typeLabel[a.type]}{modeLabel(a) ? ` · ${modeLabel(a)}` : ""}</p>
                      </div>
                      {a.status === "da_confermare" && <Badge variant="lilla">Da confermare</Badge>}
                      {a.status === "annullato" && <Badge variant="outline">Annullato</Badge>}
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        {editing && q.data && (
          <AppointmentForm initial={editing} companies={q.data.companies} team={q.data.team} visitorName={editing.visitors?.full_name}
            onDone={() => { setEditing(null); q.reload(); }} />
        )}
      </Modal>
    </>
  );
}
