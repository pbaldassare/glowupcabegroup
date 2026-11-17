import { Link } from "react-router-dom";
import { Inbox, LayoutGrid, MessageSquareText, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate, formatTime, todayLabel } from "@/lib/utils";
import { workStatusLabel, type Work } from "@/lib/types";

type Conv = { id: string; last_message_at: string | null; last_message_preview: string | null; last_author_id: string | null; company_id: string | null; companies: { legal_name: string; trade_name: string | null } | null };
type Request = { id: string; starts_at: string; mode: string | null; visitors: { full_name: string; company_name: string | null } | null };

export function Overview() {
  const { profile } = useAuth();
  const canSeeVisitors = profile?.team_role !== "operativo";
  const { data, loading } = useQuery(async () => {
    const [works, convs, reads, requests, teamRes] = await Promise.all([
      supabase.from("works").select("id, title, status, created_at, company_id, companies(legal_name, trade_name)").in("status", ["da_approvare", "in_modifica", "bozza"]).order("created_at", { ascending: false }).limit(8),
      supabase.from("conversations").select("id, last_message_at, last_message_preview, last_author_id, company_id, companies(legal_name, trade_name)").not("last_message_at", "is", null).order("last_message_at", { ascending: false }).limit(20),
      supabase.from("conversation_reads").select("conversation_id, last_read_at"),
      canSeeVisitors
        ? supabase.from("appointments").select("id, starts_at, mode, visitors(full_name, company_name)").eq("status", "da_confermare").not("visitor_user_id", "is", null).order("starts_at").limit(8)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("profiles").select("id").eq("kind", "team"),
    ]);
    const teamIds = new Set(((teamRes.data as { id: string }[]) ?? []).map((p) => p.id));
    const readMap = new Map((unwrap(reads) as { conversation_id: string; last_read_at: string }[]).map((r) => [r.conversation_id, r.last_read_at]));
    const unread = (unwrap(convs) as unknown as Conv[]).filter((c) => c.last_message_at && !(c.last_author_id && teamIds.has(c.last_author_id)) && (!readMap.get(c.id) || readMap.get(c.id)! < c.last_message_at));
    const workList = unwrap(works) as unknown as Work[];
    return {
      waiting: workList.filter((w) => w.status === "da_approvare").length,
      works: workList,
      unread,
      requests: unwrap(requests) as unknown as Request[],
    };
  });

  const counters = [
    { n: data?.waiting, label: "Lavori in attesa dei clienti", icon: LayoutGrid, to: "/admin/lavori", highlight: true },
    { n: data?.unread.length, label: "Messaggi non letti", icon: MessageSquareText, to: "/admin/messaggi" },
    ...(canSeeVisitors ? [{ n: data?.requests.length, label: "Nuove richieste dei visitatori", icon: Inbox, to: "/admin/richieste" }] : []),
  ];

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">{todayLabel()}</p>
          <h1 className="text-4xl">Panoramica</h1>
        </div>
        {profile?.team_role !== "commerciale" && (
          <Button asChild variant="accent"><Link to="/admin/lavori"><Upload /> Carica un lavoro</Link></Button>
        )}
      </header>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {counters.map(({ n, label, icon: Icon, to, highlight }) => (
              <Link key={label} to={to}>
                <Card className={`flex items-end justify-between p-6 ${highlight ? "border-2 border-arancione" : ""}`}>
                  <div>
                    <p className="font-display text-5xl text-viola">{n ?? 0}</p>
                    <p className="mt-2 font-medium text-viola">{label}</p>
                  </div>
                  <Icon className="h-7 w-7 text-arancione" />
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6">
              <h2 className="mb-4 font-sans text-lg font-semibold">In attesa dei clienti</h2>
              {data.works.length === 0 ? <p className="text-sm text-violetto">Nessun lavoro aperto.</p> : (
                <ul className="divide-y divide-border">
                  {data.works.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold text-viola">{w.title}</p>
                        <p className="text-xs text-violetto">{w.companies?.trade_name ?? w.companies?.legal_name} · {formatDate(w.created_at)}</p>
                      </div>
                      <Badge variant={w.status === "da_approvare" ? "accent" : w.status === "in_modifica" ? "lilla" : "outline"}>{workStatusLabel[w.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 font-sans text-lg font-semibold">Messaggi non letti</h2>
              {data.unread.length === 0 ? <p className="text-sm text-violetto">Tutto letto.</p> : (
                <ul className="divide-y divide-border">
                  {data.unread.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/messaggi/${c.id}`} className="flex items-center justify-between gap-3 py-3">
                        <span className="min-w-0">
                          <span className="block font-semibold text-viola">{c.companies?.trade_name ?? c.companies?.legal_name ?? "Visitatore"}</span>
                          {c.last_message_preview && <span className="block truncate text-sm text-violetto">“{c.last_message_preview}”</span>}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-violetto">{c.last_message_at && formatTime(c.last_message_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {canSeeVisitors && (
              <Card className="p-6">
                <h2 className="mb-4 font-sans text-lg font-semibold">Richieste visitatori</h2>
                {data.requests.length === 0 ? <p className="text-sm text-violetto">Nessuna call da confermare.</p> : (
                  <ul className="divide-y divide-border">
                    {data.requests.map((r) => (
                      <li key={r.id} className="py-3">
                        <p className="font-semibold text-viola">{r.visitors?.full_name}{r.visitors?.company_name ? ` · ${r.visitors.company_name}` : ""}</p>
                        <p className="text-xs text-violetto">Call: {formatDate(r.starts_at)} · {formatTime(r.starts_at)} · {r.mode === "in_sede" ? "in sede" : "al telefono"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
