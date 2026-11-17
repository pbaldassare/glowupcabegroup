import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ErrorText } from "@/components/common";
import { FilePicker } from "@/components/works/FilePicker";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/files";
import { useQuery } from "@/lib/useQuery";
import { WORK_KINDS, sendToClient } from "@/lib/works";

type Company = { id: string; legal_name: string; trade_name: string | null };
type Project = { id: string; title: string; company_id: string };

/** "Carica un lavoro" (mockup T2): bozza oppure invio al cliente con conferma. */
export function WorkNew() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ company_id: params.get("cliente") ?? "", project_id: "", title: "", kind: "Post", note: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data } = useQuery(async () => {
    const [c, p] = await Promise.all([
      supabase.from("companies").select("id, legal_name, trade_name").eq("status", "attivo").order("legal_name"),
      supabase.from("projects").select("id, title, company_id").order("title"),
    ]);
    return { companies: (c.data as Company[]) ?? [], projects: (p.data as Project[]) ?? [] };
  });
  const companies = data?.companies ?? [];
  const projects = (data?.projects ?? []).filter((p) => p.company_id === f.company_id);
  const clientName = companies.find((c) => c.id === f.company_id);

  async function save(send: boolean) {
    setBusy(true);
    setError("");
    try {
      const { data: work, error } = await supabase.from("works").insert({
        company_id: f.company_id, project_id: f.project_id || null, title: f.title.trim(), kind: f.kind,
        client_note: f.note.trim() || null, created_by: profile!.id,
      }).select("id").single();
      if (error) throw new Error("Salvataggio non riuscito");
      const paths: string[] = [];
      for (const file of files) paths.push(await uploadFile("glowup-lavori", `${f.company_id}/${work.id}`, file));
      const { data: version, error: e2 } = await supabase.from("work_versions").insert({ work_id: work.id, company_id: f.company_id, number: 1, files: paths, team_note: f.note.trim() || null }).select("id").single();
      if (e2) throw new Error("Salvataggio dei file non riuscito");
      if (send) await sendToClient(work.id, version.id);
      navigate(`/admin/lavori/${work.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!files.length) return setError("Aggiungi almeno un file.");
    setConfirm(true);
  }

  return (
    <>
      <p className="eyebrow mb-1">Lavori › Nuovo</p>
      <h1 className="mb-8 text-4xl">Carica un lavoro</h1>
      <form onSubmit={submit} className="max-w-4xl space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select id="cliente" required value={f.company_id} onChange={(e) => setF({ ...f, company_id: e.target.value, project_id: "" })}>
              <option value="" disabled>Scegli il cliente</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.trade_name ?? c.legal_name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="progetto">Progetto</Label>
            <Select id="progetto" value={f.project_id} onChange={(e) => setF({ ...f, project_id: e.target.value })} disabled={!f.company_id}>
              <option value="">Nessun progetto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="titolo">Titolo</Label>
            <Input id="titolo" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Post di dicembre – carosello" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select id="tipo" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {WORK_KINDS.map((k) => <option key={k}>{k}</option>)}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>File</Label>
          <FilePicker files={files} onChange={setFiles} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nota">Nota per il cliente</Label>
          <Textarea id="nota" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Abbiamo scaldato i colori come ci avevi chiesto." />
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" size="lg" disabled={busy || !f.company_id || !f.title.trim()} onClick={() => save(false)}>Salva come bozza</Button>
          <Button type="submit" variant="accent" size="lg" disabled={busy}><Send /> Invia al cliente</Button>
        </div>
      </form>

      <Modal open={confirm} onClose={() => !busy && setConfirm(false)}>
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-arancione text-viola"><Send className="h-6 w-6" /></span>
        <h2 className="mb-2 text-2xl">Inviare il lavoro a {clientName?.trade_name ?? clientName?.legal_name}?</h2>
        <p className="mb-6 text-violetto">Il cliente riceve una notifica e può approvare o chiedere modifiche. Prima di inviarlo, Elisa lo deve aver rivisto di persona.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={() => setConfirm(false)} disabled={busy}>Torna al modulo</Button>
          <Button variant="accent" size="lg" onClick={() => save(true)} disabled={busy}>{busy ? "Invio…" : "Sì, invia al cliente"}</Button>
        </div>
      </Modal>
    </>
  );
}
