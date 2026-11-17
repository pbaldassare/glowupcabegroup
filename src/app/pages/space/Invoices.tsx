import { useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Logo } from "@/components/Logo";
import { EmptyState, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, euro, formatDate } from "@/lib/utils";
import { invoiceBadge, invoiceLabel, invoiceState, type Invoice } from "@/lib/invoices";
import { openFile } from "./Contract";
import { SubPage } from "./SubPage";

const d = (x: string) => formatDate(x, { day: "2-digit", month: "2-digit", year: "numeric" });

/** Fatture e pagamenti (mockup C11): riepilogo, elenco e scheda della fattura. Nessun pagamento nell'app. */
export function Invoices() {
  const [open, setOpen] = useState<Invoice | null>(null);
  const { data, loading } = useQuery(async () => unwrap(await supabase.from("invoices").select("*").order("issued_on", { ascending: false })) as Invoice[]);
  const list = data ?? [];
  const unpaid = list.filter((i) => invoiceState(i) !== "pagata");
  const total = unpaid.reduce((s, i) => s + Number(i.amount), 0);
  const today = new Date().toISOString().slice(0, 10);
  const dues = unpaid.map((i) => i.due_on).filter(Boolean).sort() as string[];
  const next = dues.find((x) => x >= today) ?? dues[0];

  return (
    <SubPage title="Fatture e pagamenti">
      <div className="mb-4 flex items-end justify-between rounded-3xl bg-viola p-5 text-white">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">Da pagare</p>
          <p className="font-display text-3xl">{euro(total)}</p>
        </div>
        {next && (
          <div className="text-right">
            <p className="text-sm text-white/70">Prossima scadenza</p>
            <p className="font-semibold">{d(next)}</p>
          </div>
        )}
      </div>
      {loading ? <Spinner /> : !list.length ? (
        <EmptyState title="Nessuna fattura" />
      ) : (
        <div className="space-y-3">
          {list.map((i) => {
            const st = invoiceState(i);
            return (
              <button key={i.id} onClick={() => setOpen(i)} className="w-full text-left">
                <Card className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="font-semibold text-viola">Fattura n. {i.number}</p>
                    <p className="text-sm text-violetto">{d(i.issued_on)}</p>
                  </div>
                  <p className="font-semibold text-viola">{euro(i.amount)}</p>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", invoiceBadge[st])}>{invoiceLabel[st]}</span>
                </Card>
              </button>
            );
          })}
          <p className="pt-2 text-center text-xs text-violetto">Il pagamento non avviene nell'app: paga con i canali abituali.</p>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-xl font-semibold">Fattura n. {open.number}</h2>
                <p className="text-violetto">{d(open.issued_on)} · {euro(open.amount)}{open.due_on ? ` · scade il ${d(open.due_on)}` : ""}</p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", invoiceBadge[invoiceState(open)])}>{invoiceLabel[invoiceState(open)]}</span>
            </div>
            <div className="mb-5 flex justify-center rounded-3xl border border-border bg-muted p-6">
              <div className="w-40 rounded-lg bg-card p-4 shadow">
                <Logo className="text-lg" />
                <div className="mt-3 space-y-1.5">
                  <div className="h-1.5 w-20 rounded bg-lilla/40" /><div className="h-1.5 w-24 rounded bg-lilla/40" />
                  <div className="my-2 h-px bg-border" />
                  <div className="h-1.5 w-28 rounded bg-lilla/40" /><div className="h-1.5 w-24 rounded bg-lilla/40" /><div className="h-1.5 w-28 rounded bg-lilla/40" />
                  <div className="ml-auto mt-3 h-2 w-14 rounded bg-viola" />
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-violetto">PDF · anteprima</p>
              </div>
            </div>
            {open.file_path ? (
              <Button variant="accent" size="lg" className="w-full" onClick={() => openFile(open.file_path!)}><Download /> Scarica la fattura</Button>
            ) : (
              <p className="text-center text-sm text-violetto">Il PDF non è ancora disponibile.</p>
            )}
          </>
        )}
      </Modal>
    </SubPage>
  );
}
