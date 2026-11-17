import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorText } from "@/components/common";
import { Field } from "@/admin/pages/client/Section";
import { supabase } from "@/lib/supabase";

type Named = { id: string; name: string };

/** Nuovo progetto: dopo la creazione si apre la sua pagina per caricare i documenti. */
export function ProjectForm({ companies, services, companyId }: { companies?: Named[]; services: Named[]; companyId?: string }) {
  const navigate = useNavigate();
  const [f, setF] = useState({ company_id: companyId ?? "", title: "", service_id: "", due_on: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.from("projects").insert({
      company_id: f.company_id, title: f.title.trim(), service_id: f.service_id || null, due_on: f.due_on || null,
      started_on: new Date().toISOString().slice(0, 10),
    }).select("id").single();
    setBusy(false);
    if (error) return setError("Progetto non creato");
    navigate(`/admin/progetti/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-2xl">Nuovo progetto</h2>
      {!companyId && companies && (
        <Field label="Cliente">
          <Select required value={f.company_id} onChange={(e) => setF({ ...f, company_id: e.target.value })}>
            <option value="" disabled>Scegli il cliente</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Titolo"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Social media" /></Field>
      <Field label="Servizio"><Select value={f.service_id} onChange={(e) => setF({ ...f, service_id: e.target.value })}><option value="">—</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Consegna prevista"><Input type="date" value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" className="w-full" disabled={busy}>{busy ? "Creazione…" : "Crea il progetto e carica i documenti"}</Button>
      <p className="text-center text-xs text-violetto">Il progetto parte dallo step Ascolto.</p>
    </form>
  );
}
