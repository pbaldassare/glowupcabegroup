import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Client Supabase sullo schema glowup. Le regole di sicurezza (RLS) decidono cosa vede ciascuno. */
export const supabase = createClient(url, key, {
  db: { schema: "glowup" },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Chiama un'azione di glowup-api (invite, slots, book-call, ...). */
export async function api<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`glowup-api/${action}`, { body });
  if (error) {
    // L'errore della funzione è nel corpo JSON { error }
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? await ctx.json().then((j) => j.error).catch(() => null) : null;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}
