import { Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { unwrap, useQuery } from "@/lib/useQuery";
import { SubPage } from "./SubPage";

type Row = { id: string; description: string | null; services: { name: string } | null; packages: { name: string } | null };

export function Services() {
  const { data, loading } = useQuery(async () =>
    unwrap(await supabase.from("company_services").select("id, description, services(name), packages(name)").eq("active", true)) as unknown as Row[],
  );
  return (
    <SubPage title="Servizi attivi">
      {loading ? <Spinner /> : !data?.length ? (
        <EmptyState title="Nessun servizio attivo" />
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <Card key={s.id} className="flex items-start gap-4 p-5">
              <Package className="mt-0.5 h-6 w-6 shrink-0 text-arancione" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-viola">{s.services?.name}</p>
                  {s.packages && <Badge>Pacchetto {s.packages.name}</Badge>}
                </div>
                {s.description && <p className="mt-1 text-violetto">{s.description}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </SubPage>
  );
}
