import { useState, type FormEvent } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { ErrorText } from "@/components/common";
import { api, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { SubPage } from "./SubPage";

/** Impostazioni: notifiche, dati dell'account, cambio password, privacy, esci, cancella account. */
export function Settings() {
  const { profile, refresh, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(((profile as unknown as { notification_prefs?: Record<string, boolean> })?.notification_prefs) ?? {});
  const [data, setData] = useState({ full_name: profile?.full_name ?? "", phone: (profile as unknown as { phone?: string })?.phone ?? "" });
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleTips() {
    const next = { ...prefs, consiglio: prefs.consiglio === false };
    setPrefs(next);
    await supabase.from("profiles").update({ notification_prefs: next }).eq("id", profile!.id);
  }

  async function saveData(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: data.full_name.trim(), phone: data.phone.trim() || null }).eq("id", profile!.id);
    if (error) return setError("Dati non salvati");
    setMsg("Dati salvati.");
    refresh();
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError("Password non cambiata. Riprova.");
    setPassword("");
    setMsg("Password cambiata.");
  }

  async function deleteAccount() {
    try {
      await api("delete-account", { confirm: true });
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellazione non riuscita");
    }
  }

  return (
    <SubPage title="Impostazioni">
      <div className="space-y-5">
        {msg && <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-viola">{msg}</p>}
        <ErrorText>{error}</ErrorText>

        <Card className="p-5">
          <h2 className="mb-3 font-sans text-lg font-semibold">Notifiche</h2>
          <label className="flex items-center justify-between gap-4">
            <span>Nuovi consigli<span className="block text-sm text-violetto">Le notifiche su lavori, messaggi e appuntamenti restano sempre attive.</span></span>
            <input type="checkbox" className="h-6 w-6 accent-viola" checked={prefs.consiglio !== false} onChange={toggleTips} />
          </label>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-sans text-lg font-semibold">I tuoi dati</h2>
          <form onSubmit={saveData} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="nome">Nome</Label><Input id="nome" value={data.full_name} onChange={(e) => setData({ ...data, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="tel">Telefono</Label><Input id="tel" type="tel" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} /></div>
            <p className="text-sm text-violetto">Mail di accesso: {profile?.email}</p>
            <Button type="submit" variant="outline">Salva i dati</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-sans text-lg font-semibold">Cambia password</h2>
          <form onSubmit={savePassword} className="space-y-3">
            <PasswordInput autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nuova password" aria-label="Nuova password" />
            <Button type="submit" variant="outline">Cambia password</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-sans text-lg font-semibold">Privacy</h2>
          <p className="text-sm text-violetto">I tuoi dati restano su server in Unione Europea e li vede solo il team Gl0w-up. Per esportarli o cancellarli scrivici in Messaggi.</p>
        </Card>

        <Button variant="outline" className="w-full" onClick={signOut}><LogOut /> Esci</Button>
        {!confirmDelete ? (
          <Button variant="ghost" className="w-full text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 /> Cancella il mio account</Button>
        ) : (
          <Card className="space-y-3 border-destructive/40 p-4">
            <p className="text-sm">Vuoi davvero cancellare il tuo account? Non potrai più accedere all'app.{profile?.kind === "cliente" ? " I lavori e i documenti della tua azienda restano all'agenzia." : ""}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>Annulla</Button>
              <Button variant="destructive" className="flex-1" onClick={deleteAccount}>Cancella</Button>
            </div>
          </Card>
        )}
      </div>
    </SubPage>
  );
}
