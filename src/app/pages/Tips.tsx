import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { unwrap, useQuery } from "@/lib/useQuery";

type Tip = { id: string; title: string; category: string | null; read_minutes: number | null; points: string[]; link: string | null };

export function Tips() {
  const { data, loading } = useQuery(async () =>
    unwrap(await supabase.from("tips").select("id, title, category, read_minutes, points, link").order("publish_at", { ascending: false })) as Tip[],
  );
  return (
    <>
      <PageHeader title="Consigli" />
      {loading ? (
        <Spinner />
      ) : !data?.length ? (
        <EmptyState title="Ancora nessun consiglio" text="Presto qui idee pratiche per la tua comunicazione." />
      ) : (
        <div className="space-y-4">
          {data.map((t) => (
            <Card key={t.id} className="p-5">
              <p className="eyebrow mb-1">{[t.category, t.read_minutes && `${t.read_minutes} min`].filter(Boolean).join(" · ")}</p>
              <h2 className="mb-3 font-sans text-lg font-semibold">{t.title}</h2>
              <ol className="space-y-2">
                {t.points.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-arancione text-xs font-semibold text-white">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
              {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-viola underline">Approfondisci</a>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
