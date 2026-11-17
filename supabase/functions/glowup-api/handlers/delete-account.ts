// Cancellazione dell'account dall'app (requisito degli store). Per visitatori e clienti.
// Gli account del team li gestisce l'amministratore. Body: { confirm: true }
import { adminClient, getCaller, HttpError, json, readJson } from "../../_shared/glowup.ts";

export async function handler(req: Request): Promise<Response> {
  const db = adminClient();
  const me = await getCaller(req, db);
  if (me.kind === "team") throw new HttpError(403, "Gli account del team li gestisce l'amministratore");
  const b = await readJson<{ confirm?: boolean }>(req);
  if (b.confirm !== true) throw new HttpError(400, "Conferma richiesta");

  // Allegati personali del visitatore
  if (me.kind === "visitatore") {
    const folder = `visitatori/${me.id}`;
    const { data: files } = await db.storage.from("glowup-messaggi").list(folder, { limit: 1000 });
    if (files?.length) await db.storage.from("glowup-messaggi").remove(files.map((f) => `${folder}/${f.name}`));
  }
  // Cancella l'utente: profilo, scheda visitatore, conversazione e notifiche si cancellano a cascata.
  // I dati dell'azienda cliente (lavori, contratto, fatture) restano all'agenzia.
  const { error } = await db.auth.admin.deleteUser(me.id);
  if (error) throw error;
  return json({ deleted: true });
}
