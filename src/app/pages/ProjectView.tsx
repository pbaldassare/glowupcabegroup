import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { ErrorText, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { WorkThumb, hashSeed } from "@/components/WorkThumb";
import { StepArt, STEPS } from "@/components/projects/StepArt";
import { ProjectDocs } from "@/components/projects/ProjectDocs";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate, relativeDay } from "@/lib/utils";
import { stepLabel } from "@/lib/types";
import { latestVersion, type WorkRow } from "@/lib/works";

/** Pagina del progetto (mockup C7): i 4 step del metodo, cronologia, documenti e lavori collegati. */
export function ProjectView() {
  const { id } = useParams();
  const q = useQuery(async () => {
    const [p, s, w] = await Promise.all([
      supabase.from("projects").select("id, title, step, updated_at, company_id").eq("id", id!).maybeSingle(),
      supabase.from("project_steps").select("step, reached_at").eq("project_id", id!).order("reached_at"),
      supabase.from("works").select("id, title, status, kind, work_versions(id, number, files, sent_at)").eq("project_id", id!).order("sent_at", { ascending: false }),
    ]);
    if (!p.data) throw new Error("Progetto non trovato");
    return { project: p.data as { id: string; title: string; step: string; updated_at: string; company_id: string }, steps: (s.data as { step: string; reached_at: string }[]) ?? [], works: (w.data as unknown as WorkRow[]) ?? [] };
  }, [id]);

  if (q.loading) return <Spinner />;
  if (!q.data) return <ErrorText>{q.error}</ErrorText>;
  const { project, steps, works } = q.data;
  const current = STEPS.indexOf(project.step as (typeof STEPS)[number]);
  const lastReached = (s: string) => steps.filter((x) => x.step === s).pop()?.reached_at;

  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <BackButton to="/" />
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-violetto">Progetto</p>
      </div>
      <h1 className="text-4xl leading-tight">{project.title}</h1>
      <p className="mt-1 text-violetto">Step {current + 1} di 4 · aggiornato {relativeDay(project.updated_at)}</p>

      <div className="mt-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={cn("flex flex-col items-center gap-2 rounded-3xl border-2 bg-card px-1 pb-3 pt-2", i === current ? "border-arancione shadow-[0_0_24px_rgba(255,132,39,0.3)]" : "border-border")}>
            <span className="h-14 w-14 rounded-2xl bg-secondary/50 p-1"><StepArt step={s} muted={i > current} /></span>
            <span className={cn("text-[11px] leading-tight", i === current ? "font-bold text-viola" : i < current ? "font-medium text-viola" : "font-medium text-violetto")}>{stepLabel[s]}</span>
          </div>
        ))}
      </div>
      <div className="relative mx-[12.5%] mt-4 flex items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-secondary" />
        <span className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-viola" style={{ width: `${(current / 3) * 100}%` }} />
        {STEPS.map((s, i) => (
          <span key={s} className={cn("relative flex h-7 w-7 items-center justify-center rounded-full", i < current ? "bg-viola text-white" : i === current ? "bg-arancione shadow-[0_0_0_6px_rgba(255,132,39,0.25)]" : "border-2 border-violetto bg-avorio")}>
            {i < current && <Check className="h-4 w-4" strokeWidth={3} />}
          </span>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-sans text-xl font-semibold">Cronologia</h2>
      <Card className="divide-y divide-border px-5">
        {STEPS.slice(0, current + 1).map((s, i) => {
          const at = i < current ? lastReached(STEPS[i + 1]) : null;
          return (
            <div key={s} className="flex items-center gap-4 py-4">
              <span className={cn("h-3 w-3 rounded-full", i === current ? "bg-arancione shadow-[0_0_0_5px_rgba(255,132,39,0.25)]" : "bg-viola")} />
              <span className="flex-1 text-lg font-semibold text-viola">{stepLabel[s]}</span>
              <span className="text-violetto">{i === current ? "in corso" : `${s === "restituzione" ? "approvata" : "completato"}${at ? ` ${formatDate(at, { day: "numeric", month: "short" })}` : ""}`}</span>
            </div>
          );
        })}
      </Card>

      <h2 className="mb-3 mt-8 font-sans text-xl font-semibold">Documenti</h2>
      <ProjectDocs projectId={project.id} companyId={project.company_id} canManage={false} />

      <h2 className="mb-3 mt-8 font-sans text-xl font-semibold">Lavori collegati</h2>
      {!works.length ? <p className="text-sm text-violetto">Ancora nessun lavoro per questo progetto.</p> : (
        <div className="space-y-3">
          {works.map((w) => {
            const v = latestVersion(w.work_versions, true);
            return (
              <Link key={w.id} to={`/lavori/${w.id}`}>
                <Card className="mb-3 flex items-center gap-4 p-4">
                  <WorkThumb seed={hashSeed(w.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight text-viola">{w.title}</p>
                    {v && <p className="text-sm text-violetto">Versione {v.number}</p>}
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
