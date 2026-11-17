import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ErrorText, FullScreenSpinner } from "@/components/common";
import { AuthShell } from "@/app/AuthShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { isAppMode } from "@/lib/pwa";

/** Da invito o recupero: il link della mail apre questa pagina già collegati. */
export function SetPassword() {
  const { loading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <FullScreenSpinner />;
  if (!session) {
    return (
      <AuthShell title="Link scaduto" subtitle="Il link non è più valido. Chiedi un nuovo invito o usa “Password dimenticata” nella pagina di accesso." >
        <Button className="w-full" onClick={() => navigate("/accedi")}>Vai all'accesso</Button>
      </AuthShell>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Non siamo riusciti a salvare la password. Riprova.");
    if (profile?.kind === "team") return navigate("/admin", { replace: true });
    if (!isAppMode()) {
      // Il cliente ha aperto l'invito dal browser: ora scarica l'app e accede da lì
      await signOut();
      return navigate("/", { replace: true, state: { notice: "Password salvata. Ora installa l'app e accedi con la tua mail e la nuova password." } });
    }
    navigate("/", { replace: true });
  }

  return (
    <AuthShell title="Scegli la tua password" subtitle="Almeno 8 caratteri. La userai per accedere da ora in poi." back={null}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nuova password</Label>
          <PasswordInput id="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvataggio…" : "Salva e continua"}</Button>
      </form>
    </AuthShell>
  );
}
