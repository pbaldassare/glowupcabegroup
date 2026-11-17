import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";

/** Primo avvio: "Sei già cliente?" */
export function Welcome() {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-dvh flex-col justify-between bg-viola px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),3rem)] text-white">
      <div className="mx-auto w-full max-w-md">
        <Logo light className="text-5xl" />
        <p className="mt-4 text-lg text-white/80">You too can gl0w!</p>
      </div>
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-3xl text-white">Sei già cliente?</h1>
        <Button asChild variant="accent" size="lg" className="w-full">
          <Link to="/accedi">Sì, accedi</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full border-white/40 text-white hover:bg-white/10">
          <Link to="/registrati">Non ancora</Link>
        </Button>
      </div>
    </div>
  );
}
