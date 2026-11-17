import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/useQuery";
import { cn, formatDate } from "@/lib/utils";
import type { KnowAnswers, SurveyAnswers } from "@/lib/questionnaire";

type Row = { id: string; kind: "conoscitivo" | "gradimento"; user_id: string; company_id: string | null; answers: KnowAnswers & SurveyAnswers; submitted_at: string; companies: { legal_name: string; trade_name: string | null } | null };

/** Questionari compilati: conoscitivi (visitatori e nuovi clienti) e di gradimento (clienti). */
export function Questionnaires() {
  const [kind, setKind] = useState<"conoscitivo" | "gradimento">("conoscitivo");
  const q = useQuery(async () => {
    const [r, p] = await Promise.all([
      supabase.from("questionnaires").select("*, companies(legal_name, trade_name)").order("submitted_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    return { rows: (r.data as unknown as Row[]) ?? [], names: Object.fromEntries(((p.data as { id: string; full_name: string | null }[]) ?? []).map((x) => [x.id, x.full_name ?? ""])) };
  });
  const rows = (q.data?.rows ?? []).filter((r) => r.kind === kind);
  return (
    <>
      <h1 className="mb-6 text-4xl">Questionari</h1>
      <div className="mb-6 flex gap-2">
        {(["conoscitivo", "gradimento"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cn("rounded-full px-4 py-2 text-sm", kind === k ? "bg-viola text-white" : "border border-border text-viola")}>
            {k === "conoscitivo" ? "Conoscitivi" : "Di gradimento"} {(q.data?.rows ?? []).filter((r) => r.kind === k).length}
          </button>
        ))}
      </div>
      {q.loading ? <Spinner /> : !rows.length ? <EmptyState title="Nessun questionario" /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-5">
              <p className="font-semibold text-viola">{r.companies ? (r.companies.trade_name ?? r.companies.legal_name) : r.answers.azienda ?? q.data!.names[r.user_id]}</p>
              <p className="mb-3 text-sm text-violetto">{q.data!.names[r.user_id]} · {formatDate(r.submitted_at, { day: "numeric", month: "long", year: "numeric" })}</p>
              {r.kind === "conoscitivo" ? (
                <div className="space-y-2 text-sm">
                  {!!r.answers.bisogni?.length && <div className="flex flex-wrap gap-1.5">{r.answers.bisogni.map((b) => <Badge key={b} variant="outline">{b}</Badge>)}</div>}
                  <p>{[r.answers.settore, r.answers.modalita === "in_sede" ? "incontro in sede" : r.answers.modalita ? "al telefono" : null, r.answers.telefono].filter(Boolean).join(" · ")}</p>
                  {r.answers.note && <p className="text-violetto">“{r.answers.note}”</p>}
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {r.answers.domande?.map((d) => (
                    <p key={d.domanda} className="flex justify-between gap-3"><span>{d.domanda}</span><b className="text-arancione">{d.voto ?? "—"}/5</b></p>
                  ))}
                  {r.answers.commento && <p className="pt-2 text-violetto">“{r.answers.commento}”</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
