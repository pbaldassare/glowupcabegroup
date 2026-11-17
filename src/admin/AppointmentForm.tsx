import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText } from "@/components/common";
import { Field } from "@/admin/pages/client/Section";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn, isoToRome, romeToISO } from "@/lib/utils";
import { typeLabel } from "@/lib/calendar";
import type { Appointment } from "@/lib/types";

export type Option = { id: string; name: string };

/** Crea o modifica un appuntamento (cliente o visitatore). Il cliente riceve la notifica dal database. */
export function AppointmentForm({ initial, companies, team, onDone, visitorName }: {
  initial?: Partial<Appointment>; companies: Option[]; team: Option[]; onDone: () => void; visitorName?: string;
}) {
  const { profile } = useAuth();
  const start = initial?.starts_at ? isoToRome(initial.starts_at) : { day: new Date().toISOString().slice(0, 10), time: "10:00" };
  const [f, setF] = useState({
    company_id: initial?.company_id ?? "",
    type: initial?.type ?? "call",
    title: initial?.title ?? "",
    day: start.day,
    time: start.time,
    duration_min: String(initial?.duration_min ?? 30),
    mode: initial?.mode ?? "telefono",
    location: initial?.location ?? "",
    notes: initial?.notes ?? "",
    team_user_ids: initial?.team_user_ids ?? (profile ? [profile.id] : []),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isVisitor = !!initial?.visitor_user_id;
  const editing = !!initial?.id;

  async function save(e: FormEvent, status?: Appointment["status"]) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const row = {
      type: f.type, title: f.title.trim() || typeLabel[f.type as Appointment["type"]], starts_at: romeToISO(f.day, f.time),
      duration_min: Number(f.duration_min), mode: f.mode, location: f.location.trim() || null, notes: f.notes.trim() || null,
      team_user_ids: f.team_user_ids, ...(status ? { status } : {}),
    };
    const res = editing
      ? await supabase.from("appointments").update(row).eq("id", initial!.id!)
      : await supabase.from("appointments").insert({ ...row, company_id: f.company_id, status: "confermato", created_by: profile!.id });
    if (!res.error && status === "confermato" && initial?.visitor_user_id) {
      await supabase.from("visitors").update({ status: "call_fissata" }).eq("user_id", initial.visitor_user_id);
    }
    setBusy(false);
    if (res.error) return setError("Salvataggio non riuscito");
    onDone();
  }

  async function cancel() {
    if (!window.confirm("Annullare l'appuntamento? Il cliente riceve una notifica.")) return;
    const { error } = await supabase.from("appointments").update({ status: "annullato" }).eq("id", initial!.id!);
    if (error) return setError("Annullamento non riuscito");
    onDone();
  }

  return (
    <form onSubmit={(e) => save(e)} className="space-y-4">
      <h2 className="text-2xl">{editing ? "Appuntamento" : "Nuovo appuntamento"}</h2>
      {isVisitor ? (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-viola">Call conoscitiva con <b>{visitorName ?? "un visitatore"}</b>{initial?.status === "da_confermare" ? " · da confermare" : ""}</p>
      ) : (
        <Field label="Cliente">
          <Select required value={f.company_id} disabled={editing} onChange={(e) => setF({ ...f, company_id: e.target.value })}>
            <option value="" disabled>Scegli il cliente</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Appointment["type"] })}>
            {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Titolo"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Call di allineamento" /></Field>
        <Field label="Giorno"><Input type="date" required value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
        <Field label="Ora"><Input type="time" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        <Field label="Durata (minuti)"><Input type="number" min={5} max={600} step={5} required value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: e.target.value })} /></Field>
        <Field label="Modalità">
          <Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="telefono">Al telefono</option>
            <option value="in_sede">In sede (Legnago)</option>
            <option value="altro">Altro luogo o link</option>
          </Select>
        </Field>
      </div>
      {f.mode === "altro" && <Field label="Luogo o link"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>}
      <Field label="Note"><Textarea className="min-h-20" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div>
        <p className="mb-2 text-sm font-medium">Chi partecipa</p>
        <div className="flex flex-wrap gap-2">
          {team.map((t) => {
            const on = f.team_user_ids.includes(t.id);
            return (
              <button type="button" key={t.id} onClick={() => setF({ ...f, team_user_ids: on ? f.team_user_ids.filter((x) => x !== t.id) : [...f.team_user_ids, t.id] })}
                className={cn("rounded-full px-3 py-1.5 text-sm", on ? "bg-viola text-white" : "border border-border text-viola")}>
                {t.name}
              </button>
            );
          })}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-3 sm:grid-cols-2">
        {initial?.status === "da_confermare" ? (
          <>
            <Button type="submit" variant="outline" disabled={busy}>Salva senza confermare</Button>
            <Button type="button" variant="accent" disabled={busy} onClick={(e) => save(e as unknown as FormEvent, "confermato")}>Conferma la call</Button>
          </>
        ) : (
          <Button type="submit" variant="accent" className="sm:col-span-2" disabled={busy}>{editing ? "Salva le modifiche" : "Crea l'appuntamento"}</Button>
        )}
        {editing && initial?.status !== "annullato" && <Button type="button" variant="ghost" className="text-destructive sm:col-span-2" onClick={cancel}>Annulla l'appuntamento</Button>}
      </div>
    </form>
  );
}
