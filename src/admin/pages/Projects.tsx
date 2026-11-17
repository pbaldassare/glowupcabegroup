import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState, Spinner } from "@/components/common";
import { StepArt, STEPS } from "@/components/projects/StepArt";
import { ProjectForm } from "@/admin/ProjectForm";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";
import { stepLabel } from "@/lib/types";

type Row = { id: string; title: string; step: string; due_on: string | null; company_id: string; companies: { legal_name: string; trade_name: string | null } | null; project_files: { id: string }[]; works: { id: string; status: string }[] };

/** Progetti di tutti i clienti: si crea il progetto e poi si caricano i documenti. */
export function AdminProjects() {
  const { profile } = useAuth();
  const canWrite = profile?.team_role === "amministratore" || profile?.team_role === "operativo";
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const q = useQuery(async () => {
    const [p, c, s] = await Promise.all([
      supabase.from("projects").select("id, title, step, due_on, company_id, companies(legal_name, trade_name), project_files(id), works(id, status)").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, legal_name, trade_name").eq("status", "attivo").order("legal_name"),
      supabase.from("services").select("id, name").order("sort"),
    ]);
    return {
      projects: (p.data as unknown as Row[]) ?? [],
      companies: ((c.data as { id: string; legal_name: string; trade_name: string | null }[]) ?? []).map((x) => ({ id: x.id, name: x.trade_name ?? x.legal_name })),
      services: (s.data as { id: string; name: string }[]) ?? [],
    };
  });
  const list = (q.data?.projects ?? []).filter((p) => !client || p.company_id === client);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Progetti</h1>
        {canWrite && <Button variant="accent" onClick={() => setOpen(true)}><Plus /> Nuovo progetto</Button>}
      </header>
      <div className="mb-6 w-64">
        <Select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Filtra per cliente">
          <option value="">Tutti i clienti</option>
          {(q.data?.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      {q.loading ? <Spinner /> : !list.length ? (
        <EmptyState title="Nessun progetto" text={canWrite ? "Crea un progetto, poi carica i documenti: il cliente li trova nella sua app." : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const i = STEPS.indexOf(p.step as (typeof STEPS)[number]);
            const waiting = p.works.filter((w) => w.status === "da_approvare").length;
            return (
              <Link key={p.id} to={`/admin/progetti/${p.id}`}>
                <Card className="h-full p-5 hover:border-violetto">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="h-12 w-12 shrink-0"><StepArt step={p.step} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-viola">{p.title}</p>
                      <p className="truncate text-sm text-violetto">{p.companies?.trade_name ?? p.companies?.legal_name}</p>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-viola">Step {i + 1} di 4 · <b>{stepLabel[p.step]}</b></p>
                  <div className="mb-3 flex gap-1">{STEPS.map((s, j) => <span key={s} className={cn("h-1.5 flex-1 rounded-full", j < i ? "bg-viola" : j === i ? "bg-arancione" : "bg-secondary")} />)}</div>
                  <p className="flex flex-wrap gap-x-3 text-xs text-violetto">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {p.project_files.length} documenti</span>
                    <span>{p.works.length} lavori{waiting ? ` (${waiting} da approvare)` : ""}</span>
                    {p.due_on && <span>consegna {formatDate(p.due_on, { day: "numeric", month: "short" })}</span>}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)}>
        {q.data && <ProjectForm companies={q.data.companies} services={q.data.services} />}
      </Modal>
    </>
  );
}
