export type Invoice = { id: string; company_id: string; number: string; issued_on: string; amount: number; due_on: string | null; file_path: string | null; status: "da_pagare" | "pagata" | "scaduta"; paid_on: string | null; companies?: { legal_name: string; trade_name: string | null } | null };

/** Stato da mostrare: una fattura da pagare oltre la scadenza è "Scaduta". */
export function invoiceState(i: Invoice): "da_pagare" | "pagata" | "scaduta" {
  if (i.status === "pagata") return "pagata";
  if (i.status === "scaduta") return "scaduta";
  return i.due_on && i.due_on < new Date().toISOString().slice(0, 10) ? "scaduta" : "da_pagare";
}

export const invoiceLabel = { da_pagare: "Da pagare", pagata: "Pagata", scaduta: "Scaduta" } as const;
export const invoiceBadge = { da_pagare: "bg-arancione text-viola", pagata: "bg-viola text-white", scaduta: "bg-prugna text-white" } as const;
