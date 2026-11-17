import { Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { downloadUrl, fileName } from "@/lib/files";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate } from "@/lib/utils";
import { SubPage } from "./SubPage";

type Contract = { id: string; file_path: string | null; attachments: string[]; signed_on: string | null; starts_on: string | null; ends_on: string | null };

export async function openFile(path: string) {
  const url = await downloadUrl("glowup-documenti", path);
  if (url) window.open(url, "_blank", "noopener");
}

export function Contract() {
  const { data, loading } = useQuery(async () => unwrap(await supabase.from("contracts").select("*").order("signed_on", { ascending: false })) as Contract[]);
  const d = (x: string | null) => (x ? formatDate(x, { day: "numeric", month: "long", year: "numeric" }) : "—");
  return (
    <SubPage title="Contratto">
      {loading ? <Spinner /> : !data?.length ? (
        <EmptyState title="Il contratto comparirà qui" text="Te lo carichiamo noi appena è firmato." />
      ) : (
        <div className="space-y-4">
          {data.map((c) => (
            <Card key={c.id} className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-arancione" />
                <div className="text-sm">
                  <p className="text-lg font-semibold text-viola">Contratto firmato il {d(c.signed_on)}</p>
                  <p className="text-violetto">Dal {d(c.starts_on)} al {d(c.ends_on)}</p>
                </div>
              </div>
              {c.file_path && <Button variant="accent" className="w-full" onClick={() => openFile(c.file_path!)}><Download /> Scarica il contratto</Button>}
              {c.attachments.map((a) => (
                <button key={a} onClick={() => openFile(a)} className="flex w-full items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-left text-sm text-viola">
                  <FileText className="h-4 w-4" /> {fileName(a)}
                </button>
              ))}
            </Card>
          ))}
        </div>
      )}
    </SubPage>
  );
}
