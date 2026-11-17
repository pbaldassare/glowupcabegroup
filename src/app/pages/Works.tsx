import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { WorkThumb, hashSeed } from "@/components/WorkThumb";
import { supabase } from "@/lib/supabase";
import { signedUrls, isImage } from "@/lib/files";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn } from "@/lib/utils";
import { latestVersion, type WorkRow } from "@/lib/works";
import type { WorkStatus } from "@/lib/types";

const boxes: { key: WorkStatus; label: string }[] = [
  { key: "da_approvare", label: "Da approvare" },
  { key: "in_modifica", label: "In modifica" },
  { key: "approvato", label: "Approvati" },
];

/** Lavori (mockup C3): contatori che filtrano + elenco con miniatura, progetto, versione e stato. */
export function Works() {
  const [filter, setFilter] = useState<WorkStatus | null>(null);
  const { data, loading } = useQuery(async () => {
    const works = unwrap(await supabase.from("works").select("*, projects(title), work_versions(id, number, files, sent_at)").order("sent_at", { ascending: false, nullsFirst: false })) as WorkRow[];
    const firstImages = works.map((w) => latestVersion(w.work_versions, true)?.files.find(isImage)).filter(Boolean) as string[];
    return { works, urls: await signedUrls("glowup-lavori", firstImages) };
  });
  const works = data?.works ?? [];
  const list = filter ? works.filter((w) => w.status === filter) : works;

  return (
    <>
      <PageHeader title="Lavori" />
      <div className="mb-8 grid grid-cols-3 gap-3">
        {boxes.map((b) => {
          const active = filter === b.key || (!filter && b.key === "da_approvare");
          return (
            <button
              key={b.key}
              onClick={() => setFilter(filter === b.key ? null : b.key)}
              className={cn("rounded-3xl border-2 bg-card px-3 py-4 text-left", active ? "border-arancione" : "border-border")}
              aria-pressed={filter === b.key}
            >
              <span className="block font-display text-4xl text-viola">{works.filter((w) => w.status === b.key).length}</span>
              <span className="whitespace-nowrap text-[13px] font-medium text-viola">{b.label}</span>
              {active && <span className="mt-2 block h-1 w-10 rounded-full bg-arancione" />}
            </button>
          );
        })}
      </div>
      <h2 className="mb-3 font-sans text-lg font-semibold">{filter ? boxes.find((b) => b.key === filter)?.label : "Recenti"}</h2>
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title={filter === "da_approvare" || (!filter && !works.length) ? "Nessun lavoro da approvare. Ti avvisiamo noi." : "Niente qui per ora"} />
      ) : (
        <div className="space-y-3">
          {list.map((w) => {
            const v = latestVersion(w.work_versions, true);
            const img = v?.files.find(isImage);
            return (
              <Link key={w.id} to={`/lavori/${w.id}`}>
                <Card className="mb-3 flex items-center gap-4 p-4">
                  <WorkThumb url={img ? data?.urls[img] : null} seed={hashSeed(w.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight text-viola">{w.title}</p>
                    <p className="mb-2 text-sm text-violetto">{[w.projects?.title ?? w.kind, v && `Versione ${v.number}`].filter(Boolean).join(" · ")}</p>
                    <WorkStatusBadge status={w.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
