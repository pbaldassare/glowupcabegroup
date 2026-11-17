import { Button } from "@/components/ui/button";
import { AuthShell } from "@/app/AuthShell";
import { useAuth } from "@/lib/auth";

/** Account esistente ma non abilitato a Gl0w-up (es. utente di un'altra app dello stesso progetto). */
export function NotEnabled() {
  const { signOut } = useAuth();
  return (
    <AuthShell title="Account non abilitato" subtitle="Questo account non è collegato a Gl0w-up. Se pensi sia un errore, scrivici." back={null}>
      <Button className="w-full" onClick={signOut}>Esci</Button>
    </AuthShell>
  );
}
