import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ErrorText, Spinner } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { cn, euro } from "@/lib/utils";
import { invoiceState, type Invoice } from "@/lib/invoices";
import { InvoiceList } from "./ClientDetail";

const filters = [["tutte", "Tutte"], ["da_pagare", "Da pagare"], ["scaduta", "Scadute"], ["pagata", "Pagate"]] as const;

/** Fatture di tutti i clienti: l'amministratore segna le pagate, il commerciale legge. */
export function AdminInvoices() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("tutte");
  const [error, setError] = useState("");
  const q = useQuery(async () => unwrap(await supabase.from("invoices").select("*, companies(legal_name, trade_name)").order("issued_on", { ascending: false })) as Invoice[]);
  const all = q.data ?? [];
  const list = all.filter((i) => filter === "tutte" || invoiceState(i) === filter);
  const open = all.filter((i) => invoiceState(i) !== "pagata").reduce((s, i) => s + Number(i.amount), 0);
  return (
    <>
      <h1 className="mb-6 text-4xl">Fatture</h1>
      <Card className="mb-6 flex flex-wrap items-end justify-between gap-4 bg-viola p-6 text-white">
        <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">Da incassare</p><p className="font-display text-4xl">{euro(open)}</p></div>
        <p className="text-sm text-white/70">Le fatture si caricano dalla scheda di ogni cliente.</p>
      </Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full px-4 py-2 text-sm", filter === k ? "bg-viola text-white" : "border border-border text-viola")}>{l}</button>)}
      </div>
      <ErrorText>{error}</ErrorText>
      {q.loading ? <Spinner /> : <Card className="p-6"><InvoiceList invoices={list} canEdit={profile?.team_role === "amministratore"} onChanged={q.reload} onError={setError} showClient /></Card>}
    </>
  );
}
