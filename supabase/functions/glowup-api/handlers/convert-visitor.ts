// Trasforma un visitatore in cliente alla firma del contratto. Solo amministratore.
// Body: { visitor_user_id, company_id? , company?: { legal_name, trade_name?, sector?, contact_name?, phone?, email?, client_since? } }
import { adminClient, getCaller, HttpError, json, readJson, requireAdmin } from "../../_shared/glowup.ts";

type Body = {
  visitor_user_id: string;
  company_id?: string;
  company?: { legal_name: string; trade_name?: string; sector?: string; contact_name?: string; phone?: string; email?: string; client_since?: string };
};

export async function handler(req: Request): Promise<Response> {
  const db = adminClient();
  requireAdmin(await getCaller(req, db));
  const b = await readJson<Body>(req);

  const { data: profile } = await db.from("profiles").select("id, kind").eq("id", b.visitor_user_id).maybeSingle();
  if (!profile || profile.kind !== "visitatore") throw new HttpError(404, "Visitatore non trovato");
  const { data: visitor } = await db.from("visitors").select("*").eq("user_id", b.visitor_user_id).maybeSingle();

  let companyId = b.company_id;
  if (!companyId) {
    const c = b.company;
    const legal = c?.legal_name?.trim() || visitor?.company_name?.trim();
    if (!legal) throw new HttpError(400, "Manca la ragione sociale");
    const { data: created, error } = await db.from("companies").insert({
      legal_name: legal,
      trade_name: c?.trade_name ?? visitor?.company_name ?? null,
      sector: c?.sector ?? visitor?.sector ?? null,
      contact_name: c?.contact_name ?? visitor?.full_name ?? null,
      phone: c?.phone ?? visitor?.phone ?? null,
      email: c?.email ?? visitor?.email ?? null,
      client_since: c?.client_since ?? new Date().toISOString().slice(0, 10),
    }).select("id").single();
    if (error) throw error;
    companyId = created.id;
  } else {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true })
      .eq("company_id", companyId).eq("kind", "cliente");
    if (count) throw new HttpError(409, "Questa azienda ha già un account");
  }

  const { error: e1 } = await db.from("profiles").update({ kind: "cliente", company_id: companyId, invited_at: new Date().toISOString() })
    .eq("id", b.visitor_user_id);
  if (e1) throw e1;
  if (visitor) {
    const { error: e2 } = await db.from("visitors").update({ status: "cliente", company_id: companyId }).eq("user_id", b.visitor_user_id);
    if (e2) throw e2;
  }
  // Il questionario conoscitivo resta e si collega all'azienda
  await db.from("questionnaires").update({ company_id: companyId }).eq("user_id", b.visitor_user_id).is("company_id", null);

  const { data: u } = await db.auth.admin.getUserById(b.visitor_user_id);
  const { error: e3 } = await db.auth.admin.updateUserById(b.visitor_user_id, {
    app_metadata: { ...(u?.user?.app_metadata ?? {}), app: "glowup", kind: "cliente", company_id: companyId },
  });
  if (e3) throw e3;

  return json({ company_id: companyId });
}
