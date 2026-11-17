import { useState } from "react";
import { ChevronRight, FileText, Layers, Receipt, Star, Archive, FolderOpen, Lightbulb, Settings, LogOut, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/common";
import { api } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const clientItems = [
  { label: "Contratto", icon: FileText },
  { label: "Servizi attivi", icon: Layers },
  { label: "Fatture e pagamenti", icon: Receipt },
  { label: "Questionario di gradimento", icon: Star },
  { label: "Archivio lavori", icon: Archive },
  { label: "Materiali condivisi", icon: FolderOpen },
];

export function MySpace() {
  const { profile, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    try {
      await api("delete-account", { confirm: true });
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellazione non riuscita");
    }
  }

  return (
    <>
      <PageHeader eyebrow={profile?.email ?? undefined} title="Il mio spazio" />
      <Card className="divide-y divide-border">
        {profile?.kind === "cliente" &&
          clientItems.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 p-4 text-viola">
              <Icon className="h-5 w-5 text-arancione" />
              <span className="flex-1 font-medium">{label}</span>
              <span className="text-xs text-violetto">In arrivo</span>
            </div>
          ))}
        <Link to="/consigli" className="flex items-center gap-4 p-4 text-viola">
          <Lightbulb className="h-5 w-5 text-arancione" />
          <span className="flex-1 font-medium">Consigli</span>
          <ChevronRight className="h-5 w-5 text-violetto" />
        </Link>
        <div className="flex items-center gap-4 p-4 text-viola">
          <Settings className="h-5 w-5 text-arancione" />
          <span className="flex-1 font-medium">Impostazioni</span>
          <span className="text-xs text-violetto">In arrivo</span>
        </div>
      </Card>

      <div className="mt-8 space-y-3">
        <Button variant="outline" className="w-full" onClick={signOut}><LogOut /> Esci</Button>
        {!confirm ? (
          <Button variant="ghost" className="w-full text-destructive" onClick={() => setConfirm(true)}><Trash2 /> Cancella il mio account</Button>
        ) : (
          <Card className="space-y-3 border-destructive/40 p-4">
            <p className="text-sm">Vuoi davvero cancellare il tuo account? Non potrai più accedere all'app.{profile?.kind === "cliente" ? " I lavori e i documenti della tua azienda restano all'agenzia." : ""}</p>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)}>Annulla</Button>
              <Button variant="destructive" className="flex-1" onClick={deleteAccount}>Cancella</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
