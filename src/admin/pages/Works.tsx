import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { WorkThumb, hashSeed } from "@/components/WorkThumb";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";
import { companyName, latestVersion, type WorkRow } from "@/lib/works";
import type { WorkStatus } from "@/lib/types";

const tabs: { key: WorkStatus | "tutti"; label: string }[] = [
  { key: "tutti", label: "Tutti" },
  { key: "bozza", label: "Bozze" },
  { key: "da_approvare", label: "Da approvare" },
  { key: "in_modifica", label: "In modifica" },
  { key: "approvato", label: "Approvati" },
];

export function AdminWorks() {
  const { profile } = useAuth();
  const canWrite = profile?.team_role === "amministratore" || profile?.team_role === "operativo";
  const [tab, setTab] = useState<WorkStatus | "tutti">("tutti");
  const [client, setClient] = useState("");
  const { data, loading } = useQuery(async () =>
    unwrap(await supabase.from("works").select("*, companies(legal_name, trade_name), projects(title), work_versions(id, number, files, sent_at)").order("created_at", { ascending: false })) as WorkRow[],
  );
  const works = data ?? [];
  const clients = useMemo(() => [...new Map(works.map((w) => [w.company_id, companyName(w.companies)])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [works]);
  const list = works.filter((w) => (tab === "tutti" || w.status === tab) && (!client || w.company_id === client));

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Lavori</h1>
        {canWrite && <Button asChild variant="accent"><Link to="/admin/lavori/nuovo"><Upload /> Carica un lavoro</Link></Button>}
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("rounded-full px-4 py-2 text-sm font-medium", tab === t.key ? "bg-viola text-white" : "border border-border text-viola hover:bg-secondary")}>
            {t.label} <span className="opacity-70">{t.key === "tutti" ? works.length : works.filter((w) => w.status === t.key).length}</span>
          </button>
        ))}
        <div className="ml-auto w-56">
          <Select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Filtra per cliente">
            <option value="">Tutti i clienti</option>
            {clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </div>
      </div>
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="Nessun lavoro qui" text={canWrite ? "Carica un lavoro per mandarlo in approvazione al cliente." : undefined} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {list.map((w) => {
            const v = latestVersion(w.work_versions);
            return (
              <Link key={w.id} to={`/admin/lavori/${w.id}`}>
                <Card className="flex items-center gap-4 p-4 hover:border-violetto">
                  <WorkThumb seed={hashSeed(w.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-viola">{w.title}</p>
                    <p className="truncate text-sm text-violetto">
                      {companyName(w.companies)}{w.projects?.title ? ` · ${w.projects.title}` : ""}{v ? ` · Versione ${v.number}` : ""} · {formatDate(w.created_at, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <WorkStatusBadge status={w.status} />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
