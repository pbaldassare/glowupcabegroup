import { Link } from "react-router-dom";
import { ArrowRight, Bell, ChevronRight } from "lucide-react";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate, formatTime, todayLabel } from "@/lib/utils";
import { stepLabel, type Appointment } from "@/lib/types";

const steps = ["ascolto", "restituzione", "strategia", "consegna"];

export function Home() {
  const { profile } = useAuth();
  const { data, loading } = useQuery(async () => {
    const [todo, next, projects, tips, unread] = await Promise.all([
      supabase.from("works").select("id", { count: "exact", head: true }).eq("status", "da_approvare"),
      supabase.from("appointments").select("*").neq("status", "annullato").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1),
      supabase.from("projects").select("id, title, step").order("created_at", { ascending: false }).limit(4),
      supabase.from("tips").select("id, title, category").order("publish_at", { ascending: false }).limit(3),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    return {
      todo: todo.count ?? 0,
      next: (unwrap(next) as Appointment[])[0] ?? null,
      projects: unwrap(projects) as { id: string; title: string; step: string }[],
      tips: unwrap(tips) as { id: string; title: string; category: string | null }[],
      unread: unread.count ?? 0,
    };
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <>
      <PageHeader
        eyebrow={todayLabel()}
        title={`Ciao${firstName ? `, ${firstName}` : ""}`}
        action={
          <button className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border" aria-label="Notifiche">
            <Bell className="h-5 w-5 text-viola" />
            {!!data?.unread && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-arancione" />}
          </button>
        }
      />
      {loading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <Link to="/lavori" className="flex items-center gap-4 rounded-3xl border-2 border-arancione p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-arancione font-display text-2xl text-white">{data.todo}</span>
            <span className="flex-1">
              <span className="eyebrow block">Da fare per te</span>
              <span className="text-lg font-medium text-viola">
                {data.todo === 0 ? "Nessun lavoro da approvare" : data.todo === 1 ? "1 lavoro aspetta la tua risposta" : `${data.todo} lavori aspettano la tua risposta`}
              </span>
            </span>
            <ArrowRight className="h-5 w-5 text-viola" />
          </Link>

          <section>
            <h2 className="mb-3 font-sans text-lg font-semibold">Prossimo appuntamento</h2>
            {data.next ? (
              <Link to="/calendario">
                <Card className="flex items-center gap-4 p-4">
                  <div className="flex w-16 flex-col items-center rounded-2xl bg-viola py-2 text-white">
                    <span className="text-xs uppercase">{formatDate(data.next.starts_at, { weekday: "short" })}</span>
                    <span className="font-display text-2xl">{formatDate(data.next.starts_at, { day: "numeric" })}</span>
                    <span className="text-xs uppercase">{formatDate(data.next.starts_at, { month: "short" })}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-viola">{data.next.title}</p>
                    <p className="text-sm text-violetto">{formatDate(data.next.starts_at)} · {formatTime(data.next.starts_at)}{data.next.location ? ` · ${data.next.location}` : ""}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-violetto" />
                </Card>
              </Link>
            ) : (
              <p className="text-sm text-violetto">Nessun appuntamento in programma.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-sans text-lg font-semibold">I tuoi progetti</h2>
            {data.projects.length === 0 ? (
              <p className="text-sm text-violetto">I tuoi progetti compariranno qui.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {data.projects.map((p) => {
                  const i = steps.indexOf(p.step);
                  return (
                    <Link key={p.id} to={`/progetti/${p.id}`}><Card className="h-full p-4">
                      <p className="font-semibold text-viola">{p.title}</p>
                      <p className="mb-3 text-xs text-violetto">Step {i + 1} di 4 · <b>{stepLabel[p.step]}</b></p>
                      <div className="flex gap-1">
                        {steps.map((s, j) => (
                          <span key={s} className={`h-1.5 flex-1 rounded-full ${j < i ? "bg-viola" : j === i ? "bg-arancione" : "bg-secondary"}`} />
                        ))}
                      </div>
                    </Card></Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-sans text-lg font-semibold">Ultimi consigli</h2>
              <Link to="/consigli" className="text-sm text-violetto">Vedi tutti</Link>
            </div>
            {data.tips.length === 0 ? (
              <p className="text-sm text-violetto">Presto qui i nostri consigli per la tua comunicazione.</p>
            ) : (
              <div className="space-y-3">
                {data.tips.map((t) => (
                  <Card key={t.id} className="p-4">
                    {t.category && <p className="eyebrow mb-1">{t.category}</p>}
                    <p className="font-medium text-viola">{t.title}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
