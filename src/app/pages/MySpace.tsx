import { Link } from "react-router-dom";
import { Archive, ChevronRight, FileText, FolderOpen, Lightbulb, Package, Receipt, Settings, Star } from "lucide-react";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import { formatDate, initials } from "@/lib/utils";

/** Il mio spazio (mockup C10). */
export function MySpace() {
  const { profile } = useAuth();
  const isClient = profile?.kind === "cliente";
  const { data } = useQuery(async () => {
    if (!isClient) return null;
    const [c, svc, inv, gq, arch] = await Promise.all([
      supabase.from("companies").select("legal_name, trade_name, client_since").maybeSingle(),
      supabase.from("company_services").select("packages(name)").eq("active", true),
      supabase.from("invoices").select("status, due_on").neq("status", "pagata"),
      supabase.from("questionnaires").select("id", { count: "exact", head: true }).eq("kind", "gradimento"),
      supabase.from("works").select("id", { count: "exact", head: true }).eq("status", "approvato"),
    ]);
    const pkgs = [...new Set(((svc.data as unknown as { packages: { name: string } | null }[]) ?? []).map((s) => s.packages?.name).filter(Boolean))];
    const unpaid = ((inv.data as { status: string; due_on: string | null }[]) ?? []).length;
    return { company: c.data as { legal_name: string; trade_name: string | null; client_since: string | null } | null, pkgs, unpaid, surveyDone: (gq.count ?? 0) > 0, archived: arch.count ?? 0 };
  }, [isClient]);

  const name = data?.company?.trade_name ?? data?.company?.legal_name ?? profile?.full_name ?? "";
  const items = [
    ...(isClient
      ? [
          { to: "contratto", label: "Contratto", icon: FileText },
          { to: "servizi", label: "Servizi attivi", icon: Package, sub: data?.pkgs.length ? `Pacchetto ${data.pkgs.join(", ")}` : undefined },
          { to: "fatture", label: "Fatture e pagamenti", icon: Receipt, sub: data?.unpaid ? `${data.unpaid} da pagare` : undefined, count: data?.unpaid || undefined },
          { to: "gradimento", label: "Questionario di gradimento", icon: Star, badge: data && !data.surveyDone ? "Nuovo" : undefined },
          { to: "archivio", label: "Archivio lavori", icon: Archive, sub: data ? `${data.archived} ${data.archived === 1 ? "lavoro approvato" : "lavori approvati"}` : undefined },
          { to: "materiali", label: "Materiali condivisi", icon: FolderOpen },
        ]
      : []),
    { to: "/consigli", label: "Consigli", icon: Lightbulb },
    { to: "impostazioni", label: "Impostazioni", icon: Settings },
  ];

  return (
    <>
      <PageHeader title="Il mio spazio" />
      <div className="mb-5 flex items-center gap-4 rounded-3xl bg-viola p-5 text-white">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-arancione font-display text-xl text-viola">{initials(name)}</span>
        <div>
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-white/75">
            {isClient ? (data?.company?.client_since ? `Cliente da ${formatDate(data.company.client_since, { month: "long", year: "numeric" })}` : "Cliente Gl0w-up") : profile?.email}
          </p>
        </div>
      </div>
      <Card className="divide-y divide-border px-5">
        {items.map(({ to, label, icon: Icon, sub, count, badge }: { to: string; label: string; icon: typeof FileText; sub?: string; count?: number; badge?: string }) => (
          <Link key={to} to={to.startsWith("/") ? to : `/il-mio-spazio/${to}`} className="flex items-center gap-4 py-5 text-viola">
            <Icon className="h-6 w-6 shrink-0" />
            <span className="flex-1">
              <span className="block text-lg font-semibold leading-tight">{label}</span>
              {sub && <span className="text-sm text-violetto">{sub}</span>}
            </span>
            {count ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-arancione font-bold text-viola">{count}</span> : null}
            {badge && <Badge variant="accent" className="px-3 py-1 text-sm">{badge}</Badge>}
            <ChevronRight className="h-5 w-5 shrink-0 text-violetto" />
          </Link>
        ))}
      </Card>
    </>
  );
}
