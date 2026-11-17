import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, MessageSquareText, PencilLine, Send, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ErrorText, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { FileStage } from "@/components/works/FileStage";
import { FilePicker } from "@/components/works/FilePicker";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { signedUrls, uploadFile } from "@/lib/files";
import { useQuery } from "@/lib/useQuery";
import { formatDate, formatTime } from "@/lib/utils";
import { companyName, sendToClient, type Feedback, type Version, type WorkRow } from "@/lib/works";

type Person = { id: string; full_name: string | null; job_title: string | null };

export function WorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canWrite = profile?.team_role === "amministratore" || profile?.team_role === "operativo";
  const [newVersion, setNewVersion] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<null | string>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const q = useQuery(async () => {
    const [w, v, fb] = await Promise.all([
      supabase.from("works").select("*, companies(legal_name, trade_name), projects(title)").eq("id", id!).single(),
      supabase.from("work_versions").select("*").eq("work_id", id!).order("number", { ascending: false }),
      supabase.from("feedback").select("*").eq("work_id", id!).order("created_at", { ascending: false }),
    ]);
    if (w.error) throw new Error("Lavoro non trovato");
    const versions = (v.data as Version[]) ?? [];
    const feedback = (fb.data as Feedback[]) ?? [];
    const ids = [...new Set([...versions.map((x) => x.uploaded_by), ...feedback.map((x) => x.author_id)].filter(Boolean))] as string[];
    const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, job_title").in("id", ids) : { data: [] };
    const urls = await signedUrls("glowup-lavori", versions.flatMap((x) => x.files));
    return { work: w.data as WorkRow, versions, feedback, urls, people: Object.fromEntries(((people as Person[]) ?? []).map((p) => [p.id, p])) };
  }, [id]);

  if (q.loading) return <Spinner />;
  if (!q.data) return <ErrorText>{q.error || "Lavoro non trovato"}</ErrorText>;
  const { work, versions, feedback, urls, people } = q.data;
  const latest = versions[0];
  const unsent = latest && !latest.sent_at;

  async function send(versionId: string) {
    setBusy(true);
    setError("");
    try {
      await sendToClient(work.id, versionId);
      setConfirm(null);
      q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invio non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function uploadVersion() {
    if (!files.length) return setError("Aggiungi almeno un file.");
    setBusy(true);
    setError("");
    try {
      const paths: string[] = [];
      for (const f of files) paths.push(await uploadFile("glowup-lavori", `${work.company_id}/${work.id}`, f));
      const { data, error } = await supabase.from("work_versions").insert({ work_id: work.id, company_id: work.company_id, number: 1, files: paths, team_note: note.trim() || null }).select("id").single();
      if (error) throw new Error("Caricamento della versione non riuscito");
      setNewVersion(false);
      setFiles([]);
      setNote("");
      await q.reload();
      setConfirm(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Eliminare questa bozza? Non si può annullare.")) return;
    const { error } = await supabase.from("works").delete().eq("id", work.id);
    if (error) return setError("Eliminazione non riuscita");
    navigate("/admin/lavori", { replace: true });
  }

  async function writeToClient() {
    const { data } = await supabase.from("conversations").select("id").eq("company_id", work.company_id).maybeSingle();
    if (data) navigate(`/admin/messaggi/${data.id}?lavoro=${work.id}`);
  }

  return (
    <>
      <p className="eyebrow mb-1"><Link to="/admin/lavori">Lavori</Link> › {companyName(work.companies)}</p>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">{work.title}</h1>
          <p className="mt-1 text-violetto">{[work.kind, work.projects?.title, latest && `Versione ${latest.number}`].filter(Boolean).join(" · ")}</p>
        </div>
        <WorkStatusBadge status={work.status} className="text-sm" />
      </header>

      <div className="mb-8 flex flex-wrap gap-3">
        {canWrite && unsent && <Button variant="accent" onClick={() => setConfirm(latest.id)}><Send /> Invia al cliente</Button>}
        {canWrite && !unsent && work.status !== "approvato" && (
          <Button variant={work.status === "in_modifica" ? "accent" : "outline"} onClick={() => setNewVersion(true)}><Upload /> Carica una nuova versione</Button>
        )}
        <Button variant="outline" onClick={writeToClient}><MessageSquareText /> Scrivi al cliente su questo lavoro</Button>
        {canWrite && work.status === "bozza" && <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 /> Elimina bozza</Button>}
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="space-y-6">
        {versions.map((v) => {
          const fbs = feedback.filter((f) => f.version_id === v.id);
          const pins = fbs.flatMap((f) => f.pins ?? []);
          const by = v.uploaded_by ? people[v.uploaded_by] : undefined;
          return (
            <Card key={v.id} className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <FileStage files={v.files} urls={urls} pins={pins} />
              <div className="space-y-4">
                <div>
                  <p className="font-display text-xl text-viola">Versione {v.number}</p>
                  <p className="text-sm text-violetto">
                    Caricata {formatDate(v.created_at, { day: "numeric", month: "long" })}{by?.full_name ? ` da ${by.full_name}` : ""} ·{" "}
                    {v.sent_at ? `inviata ${formatDate(v.sent_at, { day: "numeric", month: "long" })} alle ${formatTime(v.sent_at)}` : <b className="text-arancione">non ancora inviata</b>}
                  </p>
                </div>
                {v.team_note && <p className="rounded-2xl bg-secondary p-4 text-sm"><b className="text-viola">Nota per il cliente:</b> {v.team_note}</p>}
                {fbs.length === 0 && v.sent_at && <p className="text-sm text-violetto">Il cliente non ha ancora risposto.</p>}
                {fbs.map((f) => (
                  <div key={f.id} className={`rounded-2xl border p-4 ${f.outcome === "approvato" ? "border-viola" : "border-lilla"}`}>
                    <p className="mb-2 flex items-center gap-2 font-semibold text-viola">
                      {f.outcome === "approvato" ? <CheckCircle2 className="h-5 w-5 text-arancione" /> : <PencilLine className="h-5 w-5 text-lilla" />}
                      {f.outcome === "approvato" ? "Approvato" : "Modifiche richieste"}
                      <span className="ml-auto text-xs font-normal text-violetto">{formatDate(f.created_at, { day: "numeric", month: "short" })} {formatTime(f.created_at)}</span>
                    </p>
                    {f.pins?.length > 0 && (
                      <ol className="mb-2 space-y-1 text-sm">
                        {f.pins.map((p, i) => (
                          <li key={i} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-arancione text-[11px] font-bold text-viola">{pins.indexOf(p) + 1}</span>{p.text}</li>
                        ))}
                      </ol>
                    )}
                    {f.comment && <p className="text-sm">“{f.comment}”</p>}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={newVersion} onClose={() => !busy && setNewVersion(false)}>
        <h2 className="mb-4 text-2xl">Nuova versione</h2>
        <div className="space-y-4">
          <FilePicker files={files} onChange={setFiles} />
          <div className="space-y-2">
            <Label htmlFor="nota-v">Nota per il cliente</Label>
            <Textarea id="nota-v" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cosa abbiamo cambiato" />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setNewVersion(false)} disabled={busy}>Annulla</Button>
            <Button variant="accent" onClick={uploadVersion} disabled={busy}>{busy ? "Caricamento…" : "Carica"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirm} onClose={() => !busy && setConfirm(null)}>
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-arancione text-viola"><Send className="h-6 w-6" /></span>
        <h2 className="mb-2 text-2xl">Inviare il lavoro a {companyName(work.companies)}?</h2>
        <p className="mb-6 text-violetto">Il cliente riceve una notifica e può approvare o chiedere modifiche. Prima di inviarlo, Elisa lo deve aver rivisto di persona.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" size="lg" onClick={() => setConfirm(null)} disabled={busy}>Non ancora</Button>
          <Button variant="accent" size="lg" onClick={() => confirm && send(confirm)} disabled={busy}>{busy ? "Invio…" : "Sì, invia al cliente"}</Button>
        </div>
      </Modal>
    </>
  );
}
