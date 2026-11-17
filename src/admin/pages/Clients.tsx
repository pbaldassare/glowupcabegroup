import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorText, Spinner } from "@/components/common";
import { api, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { unwrap, useQuery } from "@/lib/useQuery";
import { formatDate } from "@/lib/utils";

type Company = {
  id: string; legal_name: string; trade_name: string | null; sector: string | null; contact_name: string | null;
  email: string | null; status: "attivo" | "chiuso"; client_since: string | null;
  profiles: { id: string; email: string | null; invited_at: string | null; last_seen_at: string | null }[];
};

export function Clients() {
  const { profile } = useAuth();
  const isAdmin = profile?.team_role === "amministratore";
  const [open, setOpen] = useState(false);
  const list = useQuery(async () =>
    unwrap(await supabase.from("companies").select("id, legal_name, trade_name, sector, contact_name, email, status, client_since, profiles(id, email, invited_at, last_seen_at)").order("legal_name")) as unknown as Company[],
  );

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Clienti</h1>
        {isAdmin && <Button variant="accent" onClick={() => setOpen((o) => !o)}><Plus /> Nuovo cliente</Button>}
      </header>
      {open && isAdmin && <NewClient onDone={() => { setOpen(false); list.reload(); }} />}
      {list.loading ? (
        <Spinner />
      ) : !list.data?.length ? (
        <EmptyState title="Nessun cliente" text={isAdmin ? "Crea il primo cliente: l'azienda e il suo account ricevono l'invito via mail." : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((c) => {
            const account = c.profiles[0];
            return (
              <Link key={c.id} to={`/admin/clienti/${c.id}`}><Card className="h-full p-5 hover:border-violetto">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-viola">{c.trade_name ?? c.legal_name}</p>
                  <Badge variant={c.status === "attivo" ? "success" : "outline"}>{c.status === "attivo" ? "Attivo" : "Chiuso"}</Badge>
                </div>
                <p className="text-sm text-violetto">{[c.sector, c.contact_name].filter(Boolean).join(" · ") || c.legal_name}</p>
                <p className="mt-3 text-xs text-violetto">
                  {account ? `Account: ${account.email}${account.last_seen_at ? "" : " · invito inviato"}` : "Nessun account"}
                  {c.client_since ? ` · Cliente da ${formatDate(c.client_since, { month: "long", year: "numeric" })}` : ""}
                </p>
              </Card></Link>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Crea l'azienda e invita il suo account (glowup-api/invite). */
function NewClient({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ legal_name: "", trade_name: "", sector: "", contact_name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data: company, error } = await supabase.from("companies").insert({
        legal_name: f.legal_name.trim(), trade_name: f.trade_name.trim() || null, sector: f.sector.trim() || null,
        contact_name: f.contact_name.trim() || null, email: f.email.trim(), client_since: new Date().toISOString().slice(0, 10),
      }).select("id").single();
      if (error) throw new Error(error.message);
      const res = await api<{ email_sent: boolean; invite_link?: string }>("invite", { kind: "cliente", email: f.email.trim(), full_name: f.contact_name.trim() || undefined, company_id: company.id });
      if (res.email_sent) onDone();
      else setLink(res.invite_link ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <Card className="mb-8 space-y-3 p-6">
        <p className="font-semibold text-viola">Cliente creato. La mail non è ancora configurata: invia tu questo link al cliente.</p>
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <Button onClick={onDone}>Fatto</Button>
      </Card>
    );
  }

  return (
    <Card className="mb-8 p-6">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {([
          ["legal_name", "Ragione sociale", true],
          ["trade_name", "Nome commerciale", false],
          ["sector", "Settore", false],
          ["contact_name", "Referente", false],
          ["email", "Mail di accesso del cliente", true],
        ] as const).map(([key, label, required]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} type={key === "email" ? "email" : "text"} required={required} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
          </div>
        ))}
        <div className="md:col-span-2 space-y-3">
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy}>{busy ? "Creazione…" : "Crea cliente e invia invito"}</Button>
        </div>
      </form>
    </Card>
  );
}
