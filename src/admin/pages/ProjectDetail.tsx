import { Link, useParams } from "react-router-dom";
import { Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorText, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { StepArt, STEPS } from "@/components/projects/StepArt";
import { ProjectDocs } from "@/components/projects/ProjectDocs";
import { Section } from "./client/Section";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";
import { stepLabel, type WorkStatus } from "@/lib/types";

type Project = { id: string; title: string; step: string; due_on: string | null; started_on: string | null; company_id: string; companies: { legal_name: string; trade_name: string | null } | null; services: { name: string } | null };

/** Pagina di un progetto nel pannello: step del metodo, documenti, lavori collegati. */
export function ProjectDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const canWrite = profile?.team_role === "amministratore" || profile?.team_role === "operativo";
  const q = useQuery(async () => {
    const [p, w, s] = await Promise.all([
      supabase.from("projects").select("*, companies(legal_name, trade_name), services(name)").eq("id", id!).single(),
      supabase.from("works").select("id, title, status, kind").eq("project_id", id!).order("created_at", { ascending: false }),
      supabase.from("project_steps").select("step, reached_at").eq("project_id", id!).order("reached_at"),
    ]);
    if (p.error) throw new Error("Progetto non trovato");
    return { project: p.data as Project, works: (w.data as { id: string; title: string; status: WorkStatus; kind: string | null }[]) ?? [], steps: (s.data as { step: string; reached_at: string }[]) ?? [] };
  }, [id]);

  if (q.loading) return <Spinner />;
  if (!q.data) return <ErrorText>{q.error}</ErrorText>;
  const { project, works, steps } = q.data;
  const current = STEPS.indexOf(project.step as (typeof STEPS)[number]);
  const client = project.companies?.trade_name ?? project.companies?.legal_name;

  async function setStep(step: string) {
    if (step === project.step) return;
    await supabase.from("projects").update({ step }).eq("id", project.id);
    q.reload();
  }

  return (
    <>
      <p className="eyebrow mb-1"><Link to="/admin/progetti">Progetti</Link> › <Link to={`/admin/clienti/${project.company_id}`}>{client}</Link></p>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{project.title}</h1>
          <p className="mt-1 text-violetto">{[client, project.services?.name, project.due_on && `consegna prevista ${formatDate(project.due_on, { day: "numeric", month: "long" })}`].filter(Boolean).join(" · ")}</p>
        </div>
        {canWrite && <Button asChild variant="accent"><Link to={`/admin/lavori/nuovo?cliente=${project.company_id}&progetto=${project.id}`}><Upload /> Carica un lavoro</Link></Button>}
      </header>

      <Card className="mb-4 p-6">
        <h2 className="mb-4 font-sans text-xl font-semibold">Step del metodo</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STEPS.map((s, i) => {
            const reached = steps.filter((x) => x.step === s).pop();
            return (
              <button key={s} disabled={!canWrite} onClick={() => setStep(s)}
                className={cn("flex flex-col items-center gap-2 rounded-3xl border-2 p-4 text-center transition", i === current ? "border-arancione shadow-[0_0_24px_rgba(255,132,39,0.25)]" : "border-border", canWrite && "hover:border-violetto")}>
                <span className="h-16 w-16"><StepArt step={s} muted={i > current} /></span>
                <span className={cn("font-semibold", i > current ? "text-violetto" : "text-viola")}>{i + 1}. {stepLabel[s]}</span>
                <span className="text-xs text-violetto">{i === current ? "in corso" : i < current ? (reached ? `dal ${formatDate(reached.reached_at, { day: "numeric", month: "short" })}` : "completato") : "da fare"}</span>
              </button>
            );
          })}
        </div>
        {canWrite && <p className="mt-3 text-xs text-violetto">Tocca uno step per spostare il progetto. Il cliente vede l'avanzamento nella sua app.</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section title="Documenti">
          <ProjectDocs projectId={project.id} companyId={project.company_id} canManage={canWrite} />
        </Section>
        <Section title="Lavori collegati">
          {!works.length ? <p className="text-sm text-violetto">Nessun lavoro collegato a questo progetto.</p> : (
            <ul className="divide-y divide-border">
              {works.map((w) => (
                <li key={w.id}>
                  <Link to={`/admin/lavori/${w.id}`} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0"><span className="block truncate font-semibold text-viola">{w.title}</span><span className="text-xs text-violetto">{w.kind}</span></span>
                    <WorkStatusBadge status={w.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
