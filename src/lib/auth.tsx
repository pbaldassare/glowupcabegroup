import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

type AuthState = {
  loading: boolean;
  session: Session | null;
  /** Profilo Gl0w-up; null se l'utente non è di Gl0w-up (es. account di un'altra app del progetto) */
  profile: Profile | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(session: Session | null): Promise<Profile | null> {
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  const profile = (data as Profile | null) ?? null;

  // Visitatore appena registrato: crea la sua scheda con il consenso dato alla registrazione
  const meta = session.user.user_metadata ?? {};
  if (profile?.kind === "visitatore" && meta.privacy_consent_at) {
    const { data: v } = await supabase.from("visitors").select("user_id").eq("user_id", profile.id).maybeSingle();
    if (!v) {
      await supabase.from("visitors").insert({
        user_id: profile.id,
        full_name: meta.full_name ?? profile.full_name ?? "",
        email: session.user.email,
        privacy_consent_at: meta.privacy_consent_at,
        marketing_consent: Boolean(meta.marketing_consent),
      });
    }
  }
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refresh" | "signOut">>({ loading: true, session: null, profile: null });

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setState({ loading: false, session: data.session, profile: await loadProfile(data.session) });
  };

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // setTimeout evita di chiamare Supabase dentro il callback (raccomandazione di supabase-js)
        setTimeout(async () => setState({ loading: false, session, profile: await loadProfile(session) }), 0);
      } else {
        setState((s) => ({ ...s, session }));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <AuthContext.Provider value={{ ...state, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuori da AuthProvider");
  return ctx;
}
