import { romeDayKey } from "./utils";
import type { Appointment } from "./types";

export const typeLabel: Record<Appointment["type"], string> = {
  consegna: "Consegna prevista",
  call: "Call",
  incontro: "Incontro",
  shooting: "Shooting",
  analisi_strategica: "Analisi strategica",
};

export const modeLabel = (a: Pick<Appointment, "mode" | "location">) =>
  a.mode === "telefono" ? "al telefono" : a.mode === "in_sede" ? "in sede" : a.location ?? "";

/** Giorni da mostrare nella griglia del mese (da lunedì), con null per le caselle vuote. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // lunedì = 0
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 15)));

export function groupByDay<T extends { starts_at: string }>(list: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const a of list) {
    const k = romeDayKey(a.starts_at);
    m.set(k, [...(m.get(k) ?? []), a]);
  }
  return m;
}

/** "Aggiungi al mio calendario": file .ics che il telefono apre nel suo calendario. */
export function downloadIcs(a: Pick<Appointment, "id" | "title" | "starts_at" | "duration_min" | "location" | "mode"> & { notes?: string | null }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(a.starts_at);
  const end = new Date(start.getTime() + a.duration_min * 60000);
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gl0w-up//App//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@gl0w-up`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`${a.title} · Gl0w-up`)}`,
    a.mode === "in_sede" ? "LOCATION:Gl0w-up\\, Legnago" : a.location ? `LOCATION:${esc(a.location)}` : "",
    a.notes ? `DESCRIPTION:${esc(a.notes)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Promemoria Gl0w-up", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.title.replace(/[^\w\- ]+/g, "").trim() || "appuntamento"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
