import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/common";
import { AuthShell } from "@/app/AuthShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/** Registrazione del visitatore (per prenotare la call e ricevere conferme). */
export function Signup() {
  const { session } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", privacy: false, marketing: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.privacy) return setError("Per continuare serve il consenso al trattamento dei dati.");
    if (form.password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          app: "glowup",
          full_name: form.name.trim(),
          privacy_consent_at: new Date().toISOString(),
          marketing_consent: form.marketing,
        },
      },
    });
    setBusy(false);
    if (error) return setError(error.message.includes("registered") ? "Questa mail ha già un account: prova ad accedere." : "Registrazione non riuscita. Riprova.");
    if (!data.session) setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Controlla la mail" subtitle="Ti abbiamo scritto per confermare l'indirizzo. Poi torna qui e accedi.">
        <p className="text-sm text-violetto">Non la trovi? Guarda anche nello spam.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Conosciamoci" subtitle="Crea il tuo accesso per prenotare una call con noi e ricevere conferme e promemoria.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome e cognome</Label>
          <Input id="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-viola" checked={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.checked })} />
          <span>Ho letto l'informativa privacy e acconsento al trattamento dei miei dati. <em className="text-violetto">(obbligatorio)</em></span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-viola" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} />
          <span>Voglio ricevere novità e consigli da Gl0w-up. <em className="text-violetto">(facoltativo)</em></span>
        </label>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" variant="accent" className="w-full" disabled={busy}>{busy ? "Un attimo…" : "Crea il mio accesso"}</Button>
      </form>
    </AuthShell>
  );
}
