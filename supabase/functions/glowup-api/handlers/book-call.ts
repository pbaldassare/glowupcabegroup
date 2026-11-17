// Il visitatore prenota la call conoscitiva su uno slot libero. Resta "da confermare" finché il team non conferma.
// Body: { starts_at: ISO, mode: "telefono" | "in_sede" }
import { adminClient, freeSlots, getCaller, HttpError, json, readJson, romeDay } from "../../_shared/glowup.ts";

export async function handler(req: Request): Promise<Response> {
  const db = adminClient();
  const me = await getCaller(req, db);
  if (me.kind !== "visitatore") throw new HttpError(403, "La prenotazione della call è per i visitatori");
  const b = await readJson<{ starts_at: string; mode: string }>(req);
  if (b.mode !== "telefono" && b.mode !== "in_sede") throw new HttpError(400, "Scegli al telefono o in sede");
  const when = new Date(b.starts_at);
  if (isNaN(when.getTime())) throw new HttpError(400, "Orario non valido");

  const { data: visitor } = await db.from("visitors").select("user_id").eq("user_id", me.id).maybeSingle();
  if (!visitor) throw new HttpError(409, "Prima completa i tuoi dati e il consenso privacy");

  const { count } = await db.from("appointments").select("id", { count: "exact", head: true })
    .eq("visitor_user_id", me.id).neq("status", "annullato").gte("starts_at", new Date().toISOString());
  if (count) throw new HttpError(409, "Hai già una call prenotata: per spostarla scrivici");

  const slot = (await freeSlots(db, romeDay(when).day, 1)).find((s) => s.starts_at === when.toISOString());
  if (!slot) throw new HttpError(409, "Questo orario non è più disponibile");

  const { data, error } = await db.from("appointments").insert({
    visitor_user_id: me.id,
    type: "call",
    title: "Call conoscitiva",
    starts_at: slot.starts_at,
    duration_min: slot.minutes,
    mode: b.mode,
    location: b.mode === "in_sede" ? "Sede Gl0w-up, Legnago" : null,
    status: "da_confermare",
    team_user_ids: [slot.team_user_id],
    created_by: me.id,
  }).select("id, starts_at, duration_min, mode, status").single();
  if (error) throw error;
  return json({ appointment: data }, 201);
}
