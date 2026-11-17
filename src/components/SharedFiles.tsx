import { useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorText, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { downloadUrl, isImage, uploadFile } from "@/lib/files";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate } from "@/lib/utils";

type SharedFile = { id: string; file_path: string; name: string; folder: string | null; uploaded_by: string | null; created_at: string };

/** Materiali condivisi di un'azienda (logo, foto, brand kit): usato dall'app e dal pannello. */
export function SharedFiles({ companyId, meId, canUpload, canDeleteAll }: { companyId: string; meId: string; canUpload: boolean; canDeleteAll: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = useQuery(async () => unwrap(await supabase.from("shared_files").select("*").eq("company_id", companyId).order("created_at", { ascending: false })) as SharedFile[], [companyId]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of Array.from(files)) {
        const path = await uploadFile("glowup-condivisi", `${companyId}/generale`, f);
        const { error } = await supabase.from("shared_files").insert({ company_id: companyId, file_path: path, name: f.name, folder: "Generale", uploaded_by: meId });
        if (error) throw new Error(`"${f.name}" non salvato`);
      }
      q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito");
    } finally {
      setBusy(false);
    }
  }

  async function open(f: SharedFile) {
    const url = await downloadUrl("glowup-condivisi", f.file_path);
    if (url) window.open(url, "_blank", "noopener");
  }

  async function remove(f: SharedFile) {
    if (!window.confirm(`Eliminare "${f.name}"?`)) return;
    await supabase.storage.from("glowup-condivisi").remove([f.file_path]);
    await supabase.from("shared_files").delete().eq("id", f.id);
    q.reload();
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => input.current?.click()} disabled={busy}><Upload /> {busy ? "Caricamento…" : "Carica un file"}</Button>
          <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </>
      )}
      <ErrorText>{error}</ErrorText>
      {q.loading ? <Spinner /> : !q.data?.length ? (
        <EmptyState title="Nessun materiale" text="Logo, foto, brand kit: qui trovi i file che ci scambiamo." />
      ) : (
        <Card className="divide-y divide-border">
          {q.data.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-4">
              {isImage(f.file_path) ? <ImageIcon className="h-5 w-5 text-arancione" /> : <FileText className="h-5 w-5 text-arancione" />}
              <button onClick={() => open(f)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-medium text-viola">{f.name}</span>
                <span className="text-xs text-violetto">{formatDate(f.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
              </button>
              <button onClick={() => open(f)} aria-label={`Scarica ${f.name}`} className="text-violetto"><Download className="h-5 w-5" /></button>
              {(canDeleteAll || f.uploaded_by === meId) && <button onClick={() => remove(f)} aria-label={`Elimina ${f.name}`} className="text-violetto"><Trash2 className="h-5 w-5" /></button>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
