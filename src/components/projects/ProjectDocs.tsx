import { useRef, useState } from "react";
import { Download, Eye, EyeOff, File, FileArchive, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorText, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { downloadUrl, uploadFile } from "@/lib/files";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";

export type ProjectFile = { id: string; project_id: string; file_path: string; name: string; size_bytes: number | null; mime_type: string | null; visible_to_client: boolean; created_at: string };

export const DOC_ACCEPT = ".pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.key,.pages,.numbers,.zip,.ai,.psd,.eps,.svg,image/*,video/*";

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "doc", "docx", "odt", "rtf", "txt", "pages"].includes(ext)) return FileText;
  if (["xls", "xlsx", "ods", "csv", "numbers"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return Presentation;
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "svg", "ai", "psd", "eps"].includes(ext)) return FileImage;
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return FileVideo;
  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;
  return File;
}

const size = (b: number | null) => (b == null ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);

/** Documenti di un progetto. Il team carica, nasconde o elimina; il cliente vede e scarica quelli visibili. */
export function ProjectDocs({ projectId, companyId, canManage }: { projectId: string; companyId: string; canManage: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const q = useQuery(async () => unwrap(await supabase.from("project_files").select("*").eq("project_id", projectId).order("created_at", { ascending: false })) as ProjectFile[], [projectId]);

  async function upload(files: File[]) {
    if (!files.length) return;
    setError("");
    try {
      for (const [i, f] of files.entries()) {
        setBusy(`Caricamento ${i + 1} di ${files.length}: ${f.name}`);
        const path = await uploadFile("glowup-condivisi", `${companyId}/progetti/${projectId}`, f);
        const { error } = await supabase.from("project_files").insert({ project_id: projectId, company_id: companyId, file_path: path, name: f.name, size_bytes: f.size, mime_type: f.type || null });
        if (error) throw new Error(`"${f.name}" non salvato`);
      }
      q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito");
    } finally {
      setBusy("");
    }
  }

  async function open(f: ProjectFile) {
    const url = await downloadUrl("glowup-condivisi", f.file_path);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Impossibile aprire il file");
  }

  async function toggle(f: ProjectFile) {
    const { error } = await supabase.from("project_files").update({ visible_to_client: !f.visible_to_client }).eq("id", f.id);
    if (error) setError("Modifica non riuscita"); else q.reload();
  }

  async function remove(f: ProjectFile) {
    if (!window.confirm(`Eliminare "${f.name}"? Non si può annullare.`)) return;
    await supabase.storage.from("glowup-condivisi").remove([f.file_path]);
    const { error } = await supabase.from("project_files").delete().eq("id", f.id);
    if (error) setError("Eliminazione non riuscita"); else q.reload();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); upload(Array.from(e.dataTransfer.files)); }}
          className={cn("flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center", dragging ? "border-arancione bg-arancione/10" : "border-violetto/50")}
        >
          <Upload className="h-7 w-7 text-arancione" />
          <p className="text-sm text-violetto">Trascina qui i file oppure</p>
          <Button variant="outline" onClick={() => input.current?.click()} disabled={!!busy}>Scegli i documenti</Button>
          <p className="text-xs text-violetto">PDF, Word, Excel, PowerPoint, immagini, video, zip · fino a 100 MB l'uno</p>
          <input ref={input} type="file" multiple hidden accept={DOC_ACCEPT} onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          {busy && <p className="flex items-center gap-2 text-sm text-viola"><Spinner className="h-4 w-4" /> {busy}</p>}
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      {q.loading ? <Spinner /> : !q.data?.length ? (
        <EmptyState title="Nessun documento" text={canManage ? "Carica brief, preventivi, presentazioni, report: il cliente li trova nel suo progetto." : "Qui trovi i documenti del progetto che condividiamo con te."} />
      ) : (
        <Card className="divide-y divide-border">
          {q.data.map((f) => {
            const Icon = iconFor(f.name);
            return (
              <div key={f.id} className={cn("flex items-center gap-3 p-4", !f.visible_to_client && "bg-secondary/40")}>
                <Icon className="h-6 w-6 shrink-0 text-arancione" />
                <button onClick={() => open(f)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-medium text-viola">{f.name}</span>
                  <span className="text-xs text-violetto">
                    {formatDate(f.created_at, { day: "numeric", month: "short", year: "numeric" })}{f.size_bytes ? ` · ${size(f.size_bytes)}` : ""}
                    {canManage && !f.visible_to_client ? " · solo team" : ""}
                  </span>
                </button>
                <button onClick={() => open(f)} aria-label={`Scarica ${f.name}`} className="rounded-full p-2 text-violetto hover:bg-secondary"><Download className="h-5 w-5" /></button>
                {canManage && (
                  <>
                    <button onClick={() => toggle(f)} aria-label={f.visible_to_client ? "Nascondi al cliente" : "Mostra al cliente"} title={f.visible_to_client ? "Visibile al cliente: tocca per nasconderlo" : "Solo team: tocca per mostrarlo al cliente"} className="rounded-full p-2 text-violetto hover:bg-secondary">
                      {f.visible_to_client ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                    <button onClick={() => remove(f)} aria-label={`Elimina ${f.name}`} className="rounded-full p-2 text-violetto hover:bg-secondary"><Trash2 className="h-5 w-5" /></button>
                  </>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
