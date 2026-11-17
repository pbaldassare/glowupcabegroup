import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Europe/Rome";

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, ...opts }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function todayLabel() {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

/** Data e ora di Roma ("2026-11-20", "10:30") -> ISO in UTC. */
export function romeToISO(day: string, time: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  const offset = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
    const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - ms;
  };
  return new Date(guess - offset(guess - offset(guess))).toISOString();
}

/** ISO -> { day: "2026-11-20", time: "10:30" } nell'ora di Roma (per i campi data/ora). */
export function isoToRome(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d),
    time: new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d),
  };
}

export const romeDayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

export function euro(n: number | string | null | undefined) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));
}

/** "inviato oggi", "inviato ieri", "inviato il 3 novembre" */
export function relativeDay(iso: string) {
  const k = romeDayKey(iso);
  if (k === romeDayKey(new Date().toISOString())) return "oggi";
  if (k === romeDayKey(new Date(Date.now() - 86400000).toISOString())) return "ieri";
  return `il ${formatDate(iso, { day: "numeric", month: "long" })}`;
}

export const initials = (s: string | null | undefined) =>
  (s ?? "?").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
