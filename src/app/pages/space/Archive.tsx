import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/common";
import { WorkThumb, hashSeed } from "@/components/WorkThumb";
import { supabase } from "@/lib/supabase";
import { downloadUrl, fileName, isImage, signedUrls } from "@/lib/files";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate } from "@/lib/utils";
import { latestVersion, type WorkRow } from "@/lib/works";
import { SubPage } from "./SubPage";

/** Archivio lavori: tutti i lavori approvati e i file finali, divisi per progetto. */
export function Archive() {
  const { data, loading } = useQuery(async () => {
    const works = unwrap(await supabase.from("works").select("*, projects(title), work_versions(id, number, files, sent_at)").eq("status", "approvato").order("archived_at", { ascending: false })) as WorkRow[];
    const imgs = works.map((w) => latestVersion(w.work_versions, true)?.files.find(isImage)).filter(Boolean) as string[];
    return { works, urls: await signedUrls("glowup-lavori", imgs) };
  });
  const groups = new Map<string, WorkRow[]>();
  for (const w of data?.works ?? []) {
    const k = w.projects?.title ?? w.kind ?? "Altri lavori";
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }

  async function download(path: string) {
    const url = await downloadUrl("glowup-lavori", path);
    if (url) window.open(url, "_blank", "noopener");
  }

  return (
    <SubPage title="Archivio lavori">
      {loading ? <Spinner /> : !groups.size ? (
        <EmptyState title="L'archivio è vuoto" text="I lavori che approvi finiscono qui, con i file finali." />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([group, works]) => (
            <section key={group}>
              <h2 className="mb-3 font-sans text-lg font-semibold">{group}</h2>
              <div className="space-y-3">
                {works.map((w) => {
                  const v = latestVersion(w.work_versions, true);
                  const img = v?.files.find(isImage);
                  return (
                    <Card key={w.id} className="p-4">
                      <Link to={`/lavori/${w.id}`} className="flex items-center gap-4">
                        <WorkThumb url={img ? data?.urls[img] : null} seed={hashSeed(w.id)} />
                        <div>
                          <p className="font-semibold text-viola">{w.title}</p>
                          <p className="text-sm text-violetto">Versione {v?.number} · approvato {w.sent_at ? formatDate((w as WorkRow & { archived_at?: string }).archived_at ?? w.sent_at, { day: "numeric", month: "long" }) : ""}</p>
                        </div>
                      </Link>
                      {!!v?.files.length && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {v.files.map((f) => (
                            <button key={f} onClick={() => download(f)} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-viola">
                              <Download className="h-3.5 w-3.5" /> <span className="max-w-[10rem] truncate">{fileName(f)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </SubPage>
  );
}
