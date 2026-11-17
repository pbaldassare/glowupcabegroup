// Orari liberi per prenotare la call (senza mostrare gli appuntamenti altrui).
// Body: { from?: "YYYY-MM-DD", days?: number }  (default: da oggi, 14 giorni)
import { adminClient, freeSlots, getCaller, HttpError, json, readJson, romeDay } from "../../_shared/glowup.ts";

export async function handler(req: Request): Promise<Response> {
  const db = adminClient();
  await getCaller(req, db);
  const b = await readJson<{ from?: string; days?: number }>(req).catch(() => ({} as { from?: string; days?: number }));
  const from = b.from ?? romeDay(new Date()).day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new HttpError(400, "Data non valida");
  const slots = await freeSlots(db, from, b.days ?? 14);
  // Al visitatore basta l'orario: un solo slot per orario, il commerciale lo assegna la prenotazione.
  const unique = [...new Map(slots.map((s) => [s.starts_at, { starts_at: s.starts_at, minutes: s.minutes }])).values()];
  return json({ slots: unique });
}
