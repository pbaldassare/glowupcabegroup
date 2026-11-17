import { useState } from "react";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";
import { workStatusLabel, type Work, type WorkStatus } from "@/lib/types";

const filters: { key: WorkStatus; label: string }[] = [
  { key: "da_approvare", label: "Da approvare" },
  { key: "in_modifica", label: "In modifica" },
  { key: "approvato", label: "Approvati" },
];

export function Works() {
  const [filter, setFilter] = useState<WorkStatus>("da_approvare");
  const { data, loading } = useQuery(async () =>
    unwrap(await supabase.from("works").select("id, title, kind, status, client_note, created_at, company_id").order("created_at", { ascending: false })) as Work[],
  );
  const works = data ?? [];
  const list = works.filter((w) => w.status === filter);

  return (
    <>
      <PageHeader title="Lavori" />
      <div className="mb-6 grid grid-cols-3 gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("rounded-2xl border p-3 text-left", filter === f.key ? "border-viola bg-viola text-white" : "border-border text-viola")}
          >
            <span className="block font-display text-2xl">{works.filter((w) => w.status === f.key).length}</span>
            <span className="text-xs">{f.label}</span>
          </button>
        ))}
      </div>
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="Niente qui per ora" text="Quando ti mandiamo un lavoro lo trovi in questa pagina." />
      ) : (
        <div className="space-y-3">
          {list.map((w) => (
            <Card key={w.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-viola">{w.title}</p>
                <p className="text-xs text-violetto">{w.kind ?? "Lavoro"} · {formatDate(w.created_at)}</p>
              </div>
              <Badge variant={w.status === "da_approvare" ? "accent" : w.status === "in_modifica" ? "lilla" : "success"}>{workStatusLabel[w.status]}</Badge>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
