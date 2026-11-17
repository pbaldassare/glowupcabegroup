import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, FileText, Plus, Trash2, Upload, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ErrorText, Spinner } from "@/components/common";
import { SharedFiles } from "@/components/SharedFiles";
import { Section, Field } from "./client/Section";
import { ProjectForm as NewProject } from "@/admin/ProjectForm";
import { api, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { downloadUrl, uploadFile } from "@/lib/files";
import { useQuery } from "@/lib/useQuery";
import { cn, euro, formatDate } from "@/lib/utils";
import { stepLabel } from "@/lib/types";
import { invoiceBadge, invoiceLabel, invoiceState, type Invoice } from "@/lib/invoices";

type Company = { id: string; legal_name: string; trade_name: string | null; sector: string | null; contact_name: string | null; phone: string | null; email: string | null; status: "attivo" | "chiuso"; client_since: string | null; closed_at: string | null };
type Person = { id: string; full_name: string | null; job_title: string | null; email: string | null; kind: string; invited_at: string | null; last_seen_at: string | null };
type Project = { id: string; title: string; step: string; service_id: string | null; due_on: string | null };
type Contract = { id: string; file_path: string | null; signed_on: string | null; starts_on: string | null; ends_on: string | null };
type CompanyService = { id: string; description: string | null; services: { name: string } | null; packages: { name: string } | null };
type Named = { id: string; name: string };

const steps = ["ascolto", "restituzione", "strategia", "consegna"];
const d = (x: string | null) => (x ? formatDate(x, { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Scheda cliente: tutto quello che il cliente vede in app si riempie da qui. */
export function ClientDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const role = profile?.team_role;
  const isAdmin = role === "amministratore";
  const canProjects = isAdmin || role === "operativo";
  const seesMoney = isAdmin || role === "commerciale";
  const [modal, setModal] = useState<null | "contratto" | "servizio" | "fattura" | "progetto" | "invito">(null);
  const [error, setError] = useState("");

  const q = useQuery(async () => {
    const [c, people, team, refs, projects, contracts, services, invoices, catalogS, catalogP] = await Promise.all([
      supabase.from("companies").select("*").eq("id", id!).single(),
      supabase.from("profiles").select("id, full_name, job_title, email, kind, invited_at, last_seen_at").eq("company_id", id!),
      supabase.from("profiles").select("id, full_name, job_title, email, kind, invited_at, last_seen_at").eq("kind", "team").eq("active", true),
      supabase.from("company_team").select("team_user_id").eq("company_id", id!),
      supabase.from("projects").select("id, title, step, service_id, due_on").eq("company_id", id!).order("created_at"),
      supabase.from("contracts").select("id, file_path, signed_on, starts_on, ends_on").eq("company_id", id!).order("signed_on", { ascending: false }),
      supabase.from("company_services").select("id, description, services(name), packages(name)").eq("company_id", id!).eq("active", true),
      supabase.from("invoices").select("*").eq("company_id", id!).order("issued_on", { ascending: false }),
      supabase.from("services").select("id, name").order("sort"),
      supabase.from("packages").select("id, name").order("sort"),
    ]);
    if (c.error) throw new Error("Cliente non trovato");
    return {
      company: c.data as Company,
      account: ((people.data as Person[]) ?? [])[0] ?? null,
      team: (team.data as Person[]) ?? [],
      refs: ((refs.data as { team_user_id: string }[]) ?? []).map((r) => r.team_user_id),
      projects: (projects.data as Project[]) ?? [],
      contracts: (contracts.data as Contract[]) ?? [],
      services: (services.data as unknown as CompanyService[]) ?? [],
      invoices: (invoices.data as Invoice[]) ?? [],
      catalogS: (catalogS.data as Named[]) ?? [],
      catalogP: (catalogP.data as Named[]) ?? [],
    };
  }, [id]);

  if (q.loading) return <Spinner />;
  if (!q.data) return <ErrorText>{q.error}</ErrorText>;
  const { company, account, team, refs, projects, contracts, services, invoices, catalogS, catalogP } = q.data;
  const reload = () => { setModal(null); setError(""); q.reload(); };
  const run = async (fn: () => PromiseLike<{ error: unknown }>, msg = "Operazione non riuscita") => {
    const { error } = await fn();
    if (error) setError(msg); else reload();
  };
  const open = async (bucket: "glowup-documenti", path: string) => { const u = await downloadUrl(bucket, path); if (u) window.open(u, "_blank", "noopener"); };

  return (
    <>
      <p className="eyebrow mb-1"><Link to="/admin/clienti">Clienti</Link> › Scheda</p>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{company.trade_name ?? company.legal_name}</h1>
          <p className="mt-1 text-violetto">{company.legal_name}{company.client_since ? ` · cliente da ${formatDate(company.client_since, { month: "long", year: "numeric" })}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={company.status === "attivo" ? "success" : "outline"} className="text-sm">{company.status === "attivo" ? "Attivo" : `Chiuso il ${d(company.closed_at)}`}</Badge>
          {canProjects && <Button asChild variant="accent"><Link to={`/admin/lavori/nuovo?cliente=${company.id}`}><Upload /> Carica un lavoro</Link></Button>}
        </div>
      </header>
      <ErrorText>{error}</ErrorText>

      <div className="grid gap-4 xl:grid-cols-2">
        <CompanyData company={company} canEdit={isAdmin} onSaved={reload} onError={setError} />

        <Section title="Account e referenti">
          {account ? (
            <p className="mb-4 text-sm">
              <b className="text-viola">{account.email}</b><br />
              <span className="text-violetto">{account.last_seen_at ? `Ultimo accesso ${d(account.last_seen_at)}` : account.invited_at ? `Invitato il ${d(account.invited_at)}` : "Account attivo"}</span>
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-violetto">
              Nessun account per questo cliente.
              {isAdmin && company.status === "attivo" && <Button size="sm" variant="outline" onClick={() => setModal("invito")}><UserPlus /> Invita il cliente</Button>}
            </div>
          )}
          <p className="mb-2 text-sm font-medium">Referenti (ricevono gli avvisi dei suoi messaggi)</p>
          <div className="flex flex-wrap gap-2">
            {team.map((t) => {
              const on = refs.includes(t.id);
              return (
                <button
                  key={t.id}
                  disabled={!isAdmin}
                  onClick={() => run(() => (on ? supabase.from("company_team").delete().eq("company_id", company.id).eq("team_user_id", t.id) : supabase.from("company_team").insert({ company_id: company.id, team_user_id: t.id })))}
                  className={cn("rounded-full px-3 py-1.5 text-sm", on ? "bg-viola text-white" : "border border-dashed border-border text-violetto", !isAdmin && !on && "hidden")}
                >
                  {on ? "✓ " : "+ "}{t.full_name}{t.job_title ? ` · ${t.job_title}` : ""}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Progetti" action={canProjects && <Button size="sm" variant="outline" onClick={() => setModal("progetto")}><Plus /> Nuovo progetto</Button>}>
          {!projects.length ? <p className="text-sm text-violetto">Nessun progetto. Il primo parte allo step Ascolto.</p> : (
            <ul className="divide-y divide-border">
              {projects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link to={`/admin/progetti/${p.id}`} className="font-semibold text-viola underline-offset-4 hover:underline">{p.title}</Link>
                  {canProjects ? (
                    <div className="w-48">
                      <Select value={p.step} onChange={(e) => run(() => supabase.from("projects").update({ step: e.target.value }).eq("id", p.id))} aria-label={`Step di ${p.title}`}>
                        {steps.map((s, i) => <option key={s} value={s}>{i + 1}. {stepLabel[s]}</option>)}
                      </Select>
                    </div>
                  ) : <Badge>{stepLabel[p.step]}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {seesMoney && (
          <Section title="Contratto" action={isAdmin && <Button size="sm" variant="outline" onClick={() => setModal("contratto")}><Upload /> Carica contratto</Button>}>
            {!contracts.length ? <p className="text-sm text-violetto">Nessun contratto caricato.</p> : (
              <ul className="divide-y divide-border">
                {contracts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span><b className="text-viola">Firmato il {d(c.signed_on)}</b><br /><span className="text-violetto">Dal {d(c.starts_on)} al {d(c.ends_on)}</span></span>
                    <span className="flex gap-2">
                      {c.file_path && <Button size="sm" variant="ghost" onClick={() => open("glowup-documenti", c.file_path!)}><FileText /> PDF</Button>}
                      {isAdmin && <Button size="sm" variant="ghost" aria-label="Elimina contratto" onClick={() => window.confirm("Eliminare il contratto?") && run(() => supabase.from("contracts").delete().eq("id", c.id))}><Trash2 /></Button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {seesMoney && (
          <Section title="Servizi attivi" action={isAdmin && <Button size="sm" variant="outline" onClick={() => setModal("servizio")}><Plus /> Aggiungi servizio</Button>}>
            {!services.length ? <p className="text-sm text-violetto">Nessun servizio attivo.</p> : (
              <ul className="divide-y divide-border">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span><b className="text-viola">{s.services?.name}</b>{s.packages ? ` · Pacchetto ${s.packages.name}` : ""}{s.description && <span className="block text-violetto">{s.description}</span>}</span>
                    {isAdmin && <Button size="sm" variant="ghost" aria-label="Togli servizio" onClick={() => run(() => supabase.from("company_services").update({ active: false }).eq("id", s.id))}><X /></Button>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {seesMoney && (
          <Section title="Fatture" action={isAdmin && <Button size="sm" variant="outline" onClick={() => setModal("fattura")}><Plus /> Nuova fattura</Button>}>
            <InvoiceList invoices={invoices} canEdit={isAdmin} onChanged={reload} onError={setError} />
          </Section>
        )}

        <Section title="Materiali condivisi">
          <SharedFiles companyId={company.id} meId={profile!.id} canUpload={canProjects} canDeleteAll={canProjects} />
        </Section>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal === "progetto" && <NewProject companyId={company.id} services={catalogS} />}
        {modal === "contratto" && <ContractForm companyId={company.id} onDone={reload} />}
        {modal === "servizio" && <ServiceForm companyId={company.id} services={catalogS} packages={catalogP} onDone={reload} />}
        {modal === "fattura" && <InvoiceForm companyId={company.id} contracts={contracts} onDone={reload} />}
        {modal === "invito" && <InviteForm companyId={company.id} defaultEmail={company.email ?? ""} name={company.contact_name ?? ""} onDone={reload} />}
      </Modal>
    </>
  );
}

function CompanyData({ company, canEdit, onSaved, onError }: { company: Company; canEdit: boolean; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState(company);
  const [busy, setBusy] = useState(false);
  const fields: [keyof Company, string][] = [["legal_name", "Ragione sociale"], ["trade_name", "Nome commerciale"], ["sector", "Settore"], ["contact_name", "Referente"], ["phone", "Telefono"], ["email", "Mail"]];
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const closing = f.status === "chiuso" && company.status !== "chiuso";
    const { error } = await supabase.from("companies").update({
      legal_name: f.legal_name, trade_name: f.trade_name || null, sector: f.sector || null, contact_name: f.contact_name || null,
      phone: f.phone || null, email: f.email || null, client_since: f.client_since || null, status: f.status,
      closed_at: f.status === "chiuso" ? (closing ? new Date().toISOString() : company.closed_at) : null,
    }).eq("id", company.id);
    setBusy(false);
    if (error) onError("Dati non salvati"); else onSaved();
  }
  return (
    <Section title="Dati del cliente">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        {fields.map(([k, label]) => (
          <Field key={k} label={label}><Input value={(f[k] as string) ?? ""} disabled={!canEdit} required={k === "legal_name"} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
        <Field label="Cliente da"><Input type="date" value={f.client_since ?? ""} disabled={!canEdit} onChange={(e) => setF({ ...f, client_since: e.target.value })} /></Field>
        <Field label="Stato">
          <Select value={f.status} disabled={!canEdit} onChange={(e) => setF({ ...f, status: e.target.value as Company["status"] })}>
            <option value="attivo">Attivo</option>
            <option value="chiuso">Chiuso (3 mesi in sola lettura)</option>
          </Select>
        </Field>
        {canEdit && <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={busy}>Salva i dati</Button></div>}
      </form>
    </Section>
  );
}

export function InvoiceList({ invoices, canEdit, onChanged, onError, showClient = false }: { invoices: Invoice[]; canEdit: boolean; onChanged: () => void; onError: (m: string) => void; showClient?: boolean }) {
  if (!invoices.length) return <p className="text-sm text-violetto">Nessuna fattura.</p>;
  async function setStatus(i: Invoice, status: Invoice["status"]) {
    const { error } = await supabase.from("invoices").update({ status, paid_on: status === "pagata" ? new Date().toISOString().slice(0, 10) : null }).eq("id", i.id);
    if (error) onError("Stato non aggiornato"); else onChanged();
  }
  async function open(p: string) { const u = await downloadUrl("glowup-documenti", p); if (u) window.open(u, "_blank", "noopener"); }
  return (
    <ul className="divide-y divide-border">
      {invoices.map((i) => {
        const st = invoiceState(i);
        return (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <b className="text-viola">n. {i.number}</b>{showClient && i.companies ? ` · ${i.companies.trade_name ?? i.companies.legal_name}` : ""}
              <span className="block text-violetto">{d(i.issued_on)}{i.due_on ? ` · scade ${d(i.due_on)}` : ""}{i.paid_on ? ` · pagata ${d(i.paid_on)}` : ""}</span>
            </span>
            <b className="text-viola">{euro(i.amount)}</b>
            {canEdit ? (
              <div className="w-36">
                <Select value={i.status === "pagata" ? "pagata" : "da_pagare"} onChange={(e) => setStatus(i, e.target.value as Invoice["status"])} aria-label={`Stato fattura ${i.number}`}>
                  <option value="da_pagare">{st === "scaduta" ? "Scaduta" : "Da pagare"}</option>
                  <option value="pagata">Pagata</option>
                </Select>
              </div>
            ) : <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", invoiceBadge[st])}>{invoiceLabel[st]}</span>}
            {i.file_path && <Button size="sm" variant="ghost" onClick={() => open(i.file_path!)} aria-label="Apri PDF"><Download /></Button>}
          </li>
        );
      })}
    </ul>
  );
}

function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = (fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { await fn(); onDone(); } catch (err) { setError(err instanceof Error ? err.message : "Operazione non riuscita"); } finally { setBusy(false); }
  };
  return { busy, error, submit };
}
const must = (r: { error: unknown }) => { if (r.error) throw new Error("Salvataggio non riuscito"); };

function ContractForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [f, setF] = useState({ signed_on: "", starts_on: "", ends_on: "" });
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <form onSubmit={submit(async () => {
      const path = file ? await uploadFile("glowup-documenti", `${companyId}/contratti`, file) : null;
      must(await supabase.from("contracts").insert({ company_id: companyId, file_path: path, signed_on: f.signed_on || null, starts_on: f.starts_on || null, ends_on: f.ends_on || null }));
    })} className="space-y-4">
      <h2 className="text-2xl">Carica il contratto</h2>
      <Field label="PDF del contratto"><Input type="file" accept="application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Firmato il"><Input type="date" value={f.signed_on} onChange={(e) => setF({ ...f, signed_on: e.target.value })} /></Field>
        <Field label="Inizio"><Input type="date" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></Field>
        <Field label="Fine"><Input type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>{busy ? "Caricamento…" : "Carica"}</Button>
    </form>
  );
}

function ServiceForm({ companyId, services, packages, onDone }: { companyId: string; services: Named[]; packages: Named[]; onDone: () => void }) {
  const [f, setF] = useState({ service_id: services[0]?.id ?? "", package_id: "", description: "" });
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <form onSubmit={submit(async () => must(await supabase.from("company_services").insert({ company_id: companyId, service_id: f.service_id, package_id: f.package_id || null, description: f.description.trim() || null })))} className="space-y-4">
      <h2 className="text-2xl">Aggiungi un servizio</h2>
      <Field label="Servizio"><Select required value={f.service_id} onChange={(e) => setF({ ...f, service_id: e.target.value })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Pacchetto"><Select value={f.package_id} onChange={(e) => setF({ ...f, package_id: e.target.value })}><option value="">—</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Descrizione (una riga)"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>Aggiungi</Button>
    </form>
  );
}

function InvoiceForm({ companyId, contracts, onDone }: { companyId: string; contracts: Contract[]; onDone: () => void }) {
  const [f, setF] = useState({ number: "", issued_on: new Date().toISOString().slice(0, 10), amount: "", due_on: "", contract_id: contracts[0]?.id ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, submit } = useSubmit(onDone);
  return (
    <form onSubmit={submit(async () => {
      const path = file ? await uploadFile("glowup-documenti", `${companyId}/fatture`, file) : null;
      must(await supabase.from("invoices").insert({ company_id: companyId, number: f.number.trim(), issued_on: f.issued_on, amount: Number(f.amount.replace(",", ".")), due_on: f.due_on || null, contract_id: f.contract_id || null, file_path: path }));
    })} className="space-y-4">
      <h2 className="text-2xl">Nuova fattura</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Numero"><Input required value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
        <Field label="Importo (€)"><Input required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="1220,00" /></Field>
        <Field label="Data"><Input type="date" required value={f.issued_on} onChange={(e) => setF({ ...f, issued_on: e.target.value })} /></Field>
        <Field label="Scadenza"><Input type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
      </div>
      <Field label="PDF della fattura"><Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>{busy ? "Salvataggio…" : "Salva la fattura"}</Button>
    </form>
  );
}

function InviteForm({ companyId, defaultEmail, name, onDone }: { companyId: string; defaultEmail: string; name: string; onDone: () => void }) {
  const [email, setEmail] = useState(defaultEmail);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ email_sent: boolean; invite_link?: string }>("invite", { kind: "cliente", email: email.trim(), full_name: name || undefined, company_id: companyId });
      if (r.email_sent) onDone(); else setLink(r.invite_link ?? "");
    } catch (err) { setError(err instanceof Error ? err.message : "Invito non riuscito"); } finally { setBusy(false); }
  }
  if (link) return (
    <div className="space-y-3">
      <h2 className="text-2xl">Account creato</h2>
      <p className="text-violetto">La mail non è configurata: invia tu questo link al cliente per fargli scegliere la password.</p>
      <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
      <Button onClick={onDone} className="w-full">Fatto</Button>
    </div>
  );
  return (
    <form onSubmit={invite} className="space-y-4">
      <h2 className="text-2xl">Invita il cliente</h2>
      <Field label="Mail di accesso"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>Crea l'account</Button>
    </form>
  );
}
