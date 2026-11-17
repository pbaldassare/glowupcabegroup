import { useCallback, useEffect, useState } from "react";

/** Piccolo aiuto per caricare dati: { data, loading, error, reload }. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: true, error: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      setState({ data: await run(), loading: false, error: "" });
    } catch (e) {
      setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Errore di caricamento" });
    }
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload };
}

/** Lancia l'errore di Supabase, altrimenti restituisce i dati. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
