import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate, formatTime } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

const typeLabel: Record<Appointment["type"], string> = {
  consegna: "Consegna prevista",
  call: "Call",
  incontro: "Incontro",
  shooting: "Shooting",
  analisi_strategica: "Analisi strategica",
};

export function Calendar() {
  const { data, loading } = useQuery(async () =>
    unwrap(await supabase.from("appointments").select("*").neq("status", "annullato").gte("starts_at", new Date(Date.now() - 86400000).toISOString()).order("starts_at")) as Appointment[],
  );

  return (
    <>
      <PageHeader title="Calendario" />
      <p className="mb-6 text-sm text-violetto">Per spostare un appuntamento scrivici in Messaggi.</p>
      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState title="Nessun appuntamento" text="Qui trovi call, incontri, shooting e consegne previste." />
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="eyebrow">{typeLabel[a.type]}</p>
                {a.status === "da_confermare" && <Badge variant="outline">Da confermare</Badge>}
              </div>
              <p className="font-semibold text-viola">{a.title}</p>
              <p className="text-sm text-violetto">{formatDate(a.starts_at, { weekday: "long", day: "numeric", month: "long" })} · {formatTime(a.starts_at)} · {a.duration_min} min{a.location ? ` · ${a.location}` : ""}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
