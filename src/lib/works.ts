import { supabase } from "./supabase";
import type { WorkStatus } from "./types";

export type Pin = { file: string; x: number; y: number; text: string };
export type Version = { id: string; work_id: string; number: number; files: string[]; team_note: string | null; uploaded_by: string | null; sent_at: string | null; created_at: string };
export type Feedback = { id: string; version_id: string; outcome: "approvato" | "modifiche"; comment: string | null; pins: Pin[]; author_id: string | null; created_at: string };
export type WorkRow = {
  id: string; title: string; kind: string | null; status: WorkStatus; client_note: string | null; created_at: string; sent_at: string | null;
  company_id: string; project_id: string | null; created_by: string | null;
  companies?: { legal_name: string; trade_name: string | null } | null;
  projects?: { title: string } | null;
  work_versions?: Pick<Version, "id" | "number" | "files" | "sent_at">[];
};

export const WORK_KINDS = ["Post", "Carosello", "Reel / video", "Foto", "Sito", "Stampa", "Pubblicità", "Branding", "Restituzione", "Altro"];

/** Ultima versione (eventualmente solo tra quelle inviate al cliente). */
export function latestVersion<T extends { number: number; sent_at: string | null }>(versions: T[] | undefined, onlySent = false): T | undefined {
  return [...(versions ?? [])].filter((v) => !onlySent || v.sent_at).sort((a, b) => b.number - a.number)[0];
}

/** "Invia al cliente": la versione diventa visibile e il lavoro passa a "Da approvare" (parte la notifica). */
export async function sendToClient(workId: string, versionId: string) {
  const now = new Date().toISOString();
  const v = await supabase.from("work_versions").update({ sent_at: now }).eq("id", versionId);
  if (v.error) throw new Error("Invio non riuscito");
  const { data: w } = await supabase.from("works").select("sent_at").eq("id", workId).single();
  const u = await supabase.from("works").update({ status: "da_approvare", sent_at: w?.sent_at ?? now }).eq("id", workId);
  if (u.error) throw new Error("Invio non riuscito");
}

export const companyName = (c?: { legal_name: string; trade_name: string | null } | null) => c?.trade_name ?? c?.legal_name ?? "";
