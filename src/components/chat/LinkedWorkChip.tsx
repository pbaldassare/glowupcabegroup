import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/** Lavoro collegato al prossimo messaggio (?lavoro=<id>): "Scrivici su questo lavoro". */
export function useLinkedWork() {
  const [params, setParams] = useSearchParams();
  const id = params.get("lavoro");
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return setTitle(null);
    supabase.from("works").select("title").eq("id", id).maybeSingle().then(({ data }) => setTitle(data?.title ?? null));
  }, [id]);
  const clear = () => {
    params.delete("lavoro");
    setParams(params, { replace: true });
  };
  const chip = id && title ? (
    <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm text-viola">
      <LayoutGrid className="h-4 w-4 text-arancione" />
      <span className="min-w-0 flex-1 truncate">Su: <b>{title}</b></span>
      <button type="button" onClick={clear} aria-label="Togli il lavoro collegato"><X className="h-4 w-4" /></button>
    </div>
  ) : null;
  return { workId: id && title ? id : null, chip, clear };
}
