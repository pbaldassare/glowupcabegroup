// Funzioni comuni alle Edge Functions di Gl0w-up.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("GLOWUP_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Client con service_role sullo schema glowup: ignora la RLS, usarlo solo dopo i controlli. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    db: { schema: "glowup" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Profile = {
  id: string;
  kind: "cliente" | "visitatore" | "team";
  team_role: "amministratore" | "operativo" | "commerciale" | null;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  active: boolean;
};

/** Utente che chiama la funzione, con il suo profilo Gl0w-up attivo. */
export async function getCaller(req: Request, db: SupabaseClient): Promise<Profile> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Accesso richiesto");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sessione non valida");
  const { data: profile } = await db.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.active) throw new HttpError(403, "Account Gl0w-up non attivo");
  return profile as Profile;
}

export function requireAdmin(p: Profile) {
  if (p.kind !== "team" || p.team_role !== "amministratore") {
    throw new HttpError(403, "Operazione riservata all'amministratore");
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Richiesta non valida");
  }
}

/** Avvolge il gestore: CORS, solo POST, errori in JSON. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Errore interno" }, 500);
    }
  });
}

// ---------- Mail (Resend) ----------
export const mailConfigured = () => Boolean(Deno.env.get("RESEND_API_KEY"));

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("GLOWUP_MAIL_FROM") ?? "Gl0w-up <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) console.error("Resend", res.status, await res.text());
  return res.ok;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Mail con i colori del brand: titolo, testo e un bottone. */
export function emailTemplate(title: string, text: string, buttonLabel?: string, buttonUrl?: string): string {
  const button = buttonLabel && buttonUrl
    ? `<p style="margin:28px 0 8px"><a href="${esc(buttonUrl)}" style="background:#FF8427;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600;display:inline-block">${esc(buttonLabel)}</a></p>`
    : "";
  return `<!doctype html><html lang="it"><body style="margin:0;background:#F3F4EF;font-family:Poppins,Arial,sans-serif;color:#3F2951">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#492176;color:#ffffff;padding:24px 28px;font-size:22px;font-weight:700">gl0w up</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px;color:#492176">${esc(title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6">${esc(text)}</p>${button}
</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#745196">You too can gl0w!</td></tr>
</table></td></tr></table></body></html>`;
}

export const appUrl = (path = "") => (Deno.env.get("GLOWUP_APP_URL") ?? "").replace(/\/$/, "") + path;
export const adminUrl = (path = "") => (Deno.env.get("GLOWUP_ADMIN_URL") ?? "").replace(/\/$/, "") + path;

// ---------- Orari (Europe/Rome) ----------
const TZ = "Europe/Rome";

/** Differenza in ms tra l'ora di Roma e UTC in un dato istante. */
function romeOffset(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - ms;
}

/** "2026-11-20" + "10:30" (ora di Roma) -> Date in UTC. */
export function romeToDate(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  return new Date(guess - romeOffset(guess - romeOffset(guess)));
}

/** Data di Roma (YYYY-MM-DD) e giorno della settimana (1 = lunedì ... 7 = domenica). */
export function romeDay(date: Date): { day: string; weekday: number } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(date);
  return { day, weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1 };
}

export type Slot = { starts_at: string; team_user_id: string; minutes: number };

/**
 * Slot liberi dei commerciali tra fromDay (incluso) e i giorni successivi.
 * Esclude gli slot passati o entro 2 ore e quelli che si sovrappongono ad appuntamenti non annullati.
 */
export async function freeSlots(db: SupabaseClient, fromDay: string, days: number): Promise<Slot[]> {
  days = Math.min(Math.max(days, 1), 31);
  const { data: avail, error } = await db
    .from("availability")
    .select("team_user_id, weekday, start_time, end_time, slot_minutes, profiles!inner(active, kind, team_role)")
    .eq("profiles.active", true)
    .eq("profiles.kind", "team");
  if (error) throw error;

  const start = romeToDate(fromDay, "00:00");
  const end = new Date(start.getTime() + (days + 1) * 86400000);
  const { data: busy, error: e2 } = await db
    .from("appointments")
    .select("starts_at, duration_min, team_user_ids")
    .neq("status", "annullato")
    .gte("starts_at", new Date(start.getTime() - 86400000).toISOString())
    .lt("starts_at", end.toISOString());
  if (e2) throw e2;

  const minStart = Date.now() + 2 * 3600000;
  const slots: Slot[] = [];
  for (let i = 0; i < days; i++) {
    const { day, weekday } = romeDay(new Date(start.getTime() + i * 86400000 + 12 * 3600000));
    for (const a of avail ?? []) {
      if (a.weekday !== weekday) continue;
      let t = romeToDate(day, a.start_time.slice(0, 5)).getTime();
      const stop = romeToDate(day, a.end_time.slice(0, 5)).getTime();
      const step = a.slot_minutes * 60000;
      for (; t + step <= stop; t += step) {
        if (t < minStart) continue;
        const overlaps = (busy ?? []).some((b) => {
          if (!(b.team_user_ids ?? []).includes(a.team_user_id)) return false;
          const bs = new Date(b.starts_at).getTime();
          const be = bs + b.duration_min * 60000;
          return t < be && bs < t + step;
        });
        if (!overlaps) {
          slots.push({ starts_at: new Date(t).toISOString(), team_user_id: a.team_user_id, minutes: a.slot_minutes });
        }
      }
    }
  }
  return slots.sort((x, y) => x.starts_at.localeCompare(y.starts_at));
}
