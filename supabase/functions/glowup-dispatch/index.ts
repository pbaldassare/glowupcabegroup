// Spedisce push e mail delle notifiche in coda e crea i promemoria del giorno prima.
// Da chiamare ogni pochi minuti (cron). Accesso: Authorization con la service_role key
// oppure header x-cron-secret = GLOWUP_CRON_SECRET.
import webpush from "npm:web-push@3.6.7";
import { adminClient, adminUrl, appUrl, emailTemplate, HttpError, json, romeDay, romeToDate, sendEmail, serve } from "../_shared/glowup.ts";

const vapidPublic = Deno.env.get("GLOWUP_VAPID_PUBLIC_KEY");
const vapidPrivate = Deno.env.get("GLOWUP_VAPID_PRIVATE_KEY");
const pushReady = Boolean(vapidPublic && vapidPrivate);
if (pushReady) webpush.setVapidDetails(Deno.env.get("GLOWUP_VAPID_SUBJECT") ?? "mailto:info@example.com", vapidPublic!, vapidPrivate!);

function authorized(req: Request): boolean {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const secret = Deno.env.get("GLOWUP_CRON_SECRET");
  return bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (!!secret && req.headers.get("x-cron-secret") === secret);
}

serve(async (req) => {
  if (!authorized(req)) throw new HttpError(401, "Non autorizzato");
  const db = adminClient();

  // 1. Promemoria per gli appuntamenti confermati di domani
  const tomorrow = romeDay(new Date(Date.now() + 86400000)).day;
  const from = romeToDate(tomorrow, "00:00").toISOString();
  const to = new Date(romeToDate(tomorrow, "00:00").getTime() + 86400000).toISOString();
  const { data: appts } = await db.from("appointments")
    .select("id, title, starts_at, company_id, visitor_user_id")
    .eq("status", "confermato").is("reminder_sent_at", null).gte("starts_at", from).lt("starts_at", to);
  let reminders = 0;
  for (const a of appts ?? []) {
    let users: string[] = a.visitor_user_id ? [a.visitor_user_id] : [];
    if (a.company_id) {
      const { data } = await db.from("profiles").select("id").eq("company_id", a.company_id).eq("kind", "cliente").eq("active", true);
      users = (data ?? []).map((p) => p.id);
    }
    const time = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(a.starts_at));
    if (users.length) {
      await db.from("notifications").insert(users.map((u) => ({
        user_id: u, kind: "promemoria", title: `Domani alle ${time}: ${a.title}`, link: "/calendario",
      })));
      reminders += users.length;
    }
    await db.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id);
  }

  // 2. Notifiche in coda: push (se configurato) e mail (se richiesta e configurata)
  const { data: queue } = await db.from("notifications")
    .select("id, user_id, kind, title, body, link, send_email, profiles(email, active, kind, notification_prefs)")
    .is("sent_at", null).order("created_at").limit(200);
  let pushes = 0, emails = 0;
  for (const n of queue ?? []) {
    // deno-lint-ignore no-explicit-any
    const p = (n as any).profiles as { email: string | null; active: boolean; kind: string; notification_prefs: Record<string, boolean> } | null;
    const wanted = p?.active && p.notification_prefs?.[n.kind] !== false;
    if (wanted && pushReady) {
      const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", n.user_id);
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            JSON.stringify({ title: n.title, body: n.body ?? "", url: n.link ?? "/" }),
          );
          pushes++;
        } catch (e) {
          // deno-lint-ignore no-explicit-any
          const code = (e as any)?.statusCode;
          if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
          else console.error("push", code, e);
        }
      }
    }
    if (wanted && n.send_email && p?.email) {
      const ok = await sendEmail(p.email, n.title, emailTemplate(n.title, n.body ?? "Apri l'app per i dettagli.", "Apri Gl0w-up", (p.kind === "team" ? adminUrl : appUrl)(n.link ?? "/")));
      if (ok) emails++;
    }
    await db.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
  }

  return json({ reminders, processed: queue?.length ?? 0, pushes, emails, push_configured: pushReady });
});
