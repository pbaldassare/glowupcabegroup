import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorText } from "@/components/common";
import { AuthShell } from "@/app/AuthShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/** teamOnly: login dal browser, riservato al team (i clienti usano l'app installata). */
export function Login({ teamOnly = false }: { teamOnly?: boolean }) {
  const { session, profile, loading, signOut } = useAuth();
  const isAdmin = teamOnly;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (!loading && session && teamOnly && profile?.kind !== "team") {
    return (
      <AuthShell title="Accesso riservato al team" subtitle="Clienti e visitatori accedono dall'app Gl0w-up installata sul telefono." back={null}>
        <div className="space-y-3">
          <Button asChild variant="accent" className="w-full"><Link to="/" onClick={() => signOut()}>Scarica l'app</Link></Button>
          <Button variant="outline" className="w-full" onClick={signOut}>Esci</Button>
        </div>
      </AuthShell>
    );
  }
  if (!loading && session) return <Navigate to={profile?.kind === "team" ? "/admin" : "/"} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError("Mail o password non corretti.");
  }

  async function forgot() {
    if (!email.trim()) return setError("Scrivi la tua mail, poi tocca di nuovo “Password dimenticata”.");
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/imposta-password`,
    });
    if (error) setError("Non siamo riusciti a inviare la mail. Riprova tra poco.");
    else setInfo("Ti abbiamo mandato una mail per scegliere una nuova password.");
  }

  return (
    <AuthShell
      title={isAdmin ? "Pannello Gl0w-up" : "Bentornato"}
      subtitle={isAdmin ? "Accedi con il tuo account del team." : "Accedi con la mail con cui ti abbiamo invitato."}
      back={isAdmin ? "/" : "/benvenuto"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Mail</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        {info && <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-viola">{info}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Accesso…" : "Accedi"}</Button>
        <Button type="button" variant="link" className="w-full" onClick={forgot}>Password dimenticata</Button>
      </form>
      {!isAdmin && (
        <p className="mt-6 text-center text-sm text-violetto">
          Non sei ancora cliente? <Link to="/registrati" className="font-semibold text-viola underline">Conosciamoci</Link>
        </p>
      )}
    </AuthShell>
  );
}
