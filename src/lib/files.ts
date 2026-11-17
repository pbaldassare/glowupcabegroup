import { supabase } from "./supabase";

export type Bucket = "glowup-lavori" | "glowup-documenti" | "glowup-condivisi" | "glowup-messaggi" | "glowup-consigli";

export const MAX_MB = 100;

/** Carica un file e restituisce il percorso salvato. */
export async function uploadFile(bucket: Bucket, folder: string, file: File): Promise<string> {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`"${file.name}" supera ${MAX_MB} MB`);
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Caricamento di "${file.name}" non riuscito`);
  return path;
}

/** Link temporanei (1 ora) per aprire i file privati. */
export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return {};
  const { data } = await supabase.storage.from(bucket).createSignedUrls(list, 3600);
  return Object.fromEntries((data ?? []).filter((x) => x.path && x.signedUrl).map((x) => [x.path!, x.signedUrl]));
}

export async function downloadUrl(bucket: Bucket, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600, { download: fileName(path) });
  return data?.signedUrl ?? null;
}

export const fileName = (path: string) => path.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");
export const isImage = (path: string) => /\.(png|jpe?g|gif|webp|avif|heic)$/i.test(path);
export const isVideo = (path: string) => /\.(mp4|mov|webm|m4v)$/i.test(path);
export const isPdf = (path: string) => /\.pdf$/i.test(path);
