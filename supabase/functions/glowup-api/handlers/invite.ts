// Invita un cliente (un account per azienda) o un membro del team. Solo amministratore.
// Body: { kind: "cliente" | "team", email, full_name?, company_id? (cliente), team_role? (team) }
import {
  adminClient, adminUrl, appUrl, emailTemplate, getCaller, HttpError, json, mailConfigured, readJson,
  requireAdmin, sendEmail, 
} from "../../_shared/glowup.ts";

type Body = { kind: "cliente" | "team"; email: string; full_name?: string; company_id?: string; team_role?: string };

export async function handler(req: Request): Promise<Response> {
  const db = adminClient();
  requireAdmin(await getCaller(req, db));
  const b = await readJson<Body>(req);
  const email = (b.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Mail non valida");
  if (b.kind !== "cliente" && b.kind !== "team") throw new HttpError(400, "Tipo non valido");

  const app_metadata: Record<string, string> = { app: "glowup", kind: b.kind };
  if (b.kind === "cliente") {
    if (!b.company_id) throw new HttpError(400, "Manca l'azienda");
    const { data: company } = await db.from("companies").select("id, status").eq("id", b.company_id).maybeSingle();
    if (!company) throw new HttpError(404, "Azienda non trovata");
    if (company.status !== "attivo") throw new HttpError(409, "L'azienda non è attiva");
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true })
      .eq("company_id", b.company_id).eq("kind", "cliente");
    if (count) throw new HttpError(409, "Questa azienda ha già un account");
    app_metadata.company_id = b.company_id;
  } else {
    const role = b.team_role ?? "operativo";
    if (!["amministratore", "operativo", "commerciale"].includes(role)) throw new HttpError(400, "Ruolo non valido");
    app_metadata.team_role = role;
  }

  const { data: created, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata,
    user_metadata: { app: "glowup", full_name: b.full_name ?? null },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      throw new HttpError(409, "Questa mail ha già un account (anche in un'altra app del progetto). Se è un visitatore, usa la conversione in cliente.");
    }
    throw error;
  }

  const redirectTo = b.kind === "team" ? adminUrl("/imposta-password") : appUrl("/imposta-password");
  const { data: link, error: linkError } = await db.auth.admin.generateLink({
    type: "recovery",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (linkError) throw linkError;
  const actionLink = link.properties.action_link;

  const sent = await sendEmail(
    email,
    "Benvenuto in Gl0w-up",
    emailTemplate(
      b.full_name ? `Ciao ${b.full_name}!` : "Benvenuto!",
      b.kind === "cliente"
        ? "Ti abbiamo creato l'accesso all'app Gl0w-up: qui approvi i lavori, ci scrivi e trovi appuntamenti, contratto e fatture. Imposta la tua password per iniziare."
        : "Ti abbiamo creato l'accesso al pannello di Gl0w-up. Imposta la tua password per iniziare.",
      "Imposta la password",
      actionLink,
    ),
  );

  return json({
    user_id: created.user.id,
    email_sent: sent,
    // Se la mail non è configurata, l'amministratore può inoltrare il link a mano.
    invite_link: sent ? undefined : actionLink,
    note: mailConfigured() ? undefined : "RESEND_API_KEY non impostata: mail non inviata",
  }, 201);
}
