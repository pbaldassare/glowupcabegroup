import { supabase } from "@/lib/supabase";
import { signedUrls } from "@/lib/files";
import { useQuery } from "@/lib/useQuery";
import type { Feedback, Version, WorkRow } from "@/lib/works";

type Person = { id: string; full_name: string | null; job_title: string | null };

/** Lavoro visto dal cliente: solo le versioni inviate (lo garantiscono le regole del database). */
export function useWork(id: string | undefined) {
  return useQuery(async () => {
    const [w, v, fb] = await Promise.all([
      supabase.from("works").select("*, projects(title)").eq("id", id!).maybeSingle(),
      supabase.from("work_versions").select("*").eq("work_id", id!).not("sent_at", "is", null).order("number", { ascending: false }),
      supabase.from("feedback").select("*").eq("work_id", id!).order("created_at", { ascending: false }),
    ]);
    if (!w.data) throw new Error("Lavoro non trovato");
    const versions = (v.data as Version[]) ?? [];
    const authorIds = [...new Set(versions.map((x) => x.uploaded_by).filter(Boolean))] as string[];
    const { data: people } = authorIds.length ? await supabase.from("profiles").select("id, full_name, job_title").in("id", authorIds) : { data: [] };
    return {
      work: w.data as WorkRow,
      versions,
      feedback: (fb.data as Feedback[]) ?? [],
      urls: await signedUrls("glowup-lavori", versions.flatMap((x) => x.files)),
      people: Object.fromEntries(((people as Person[]) ?? []).map((p) => [p.id, p])) as Record<string, Person>,
    };
  }, [id]);
}
