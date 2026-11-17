import { CalendarDays, ClipboardList, FolderKanban, Home, Inbox, LayoutGrid, Lightbulb, MessageSquareText, Receipt, Star, Users } from "lucide-react";
import type { TeamRole } from "@/lib/types";

export type Section = { path: string; label: string; icon: typeof Home; roles: TeamRole[]; description: string };

const all: TeamRole[] = ["amministratore", "operativo", "commerciale"];

/** Voci del backoffice e ruoli che le vedono (permessi in docs/app-e-backoffice.md). */
export const sections: Section[] = [
  { path: "", label: "Panoramica", icon: Home, roles: all, description: "" },
  { path: "clienti", label: "Clienti", icon: Users, roles: all, description: "" },
  { path: "progetti", label: "Progetti", icon: FolderKanban, roles: all, description: "" },
  { path: "lavori", label: "Lavori", icon: LayoutGrid, roles: all, description: "Carica un lavoro per l'approvazione, salvalo come bozza o invialo al cliente, gestisci le versioni e leggi i commenti e le note sulle immagini." },
  { path: "calendario", label: "Calendario", icon: CalendarDays, roles: all, description: "Crea, sposta e annulla appuntamenti per cliente e conferma le call dei visitatori." },
  { path: "messaggi", label: "Messaggi", icon: MessageSquareText, roles: all, description: "Casella unica di tutte le conversazioni con clienti e visitatori, con i non letti in evidenza." },
  { path: "consigli", label: "Consigli", icon: Lightbulb, roles: all, description: "Scrivi le schede come bozza, pubblicale subito o in una data programmata, ritirale." },
  { path: "richieste", label: "Richieste visitatori", icon: Inbox, roles: ["amministratore", "commerciale"], description: "Leggi i questionari dei visitatori, imposta le fasce prenotabili, fissa le call e segna l'esito; alla firma trasforma il visitatore in cliente." },
  { path: "questionari", label: "Questionari", icon: Star, roles: all, description: "Questionari conoscitivi e di gradimento, conferma dell'analisi strategica." },
  { path: "fatture", label: "Fatture", icon: Receipt, roles: ["amministratore", "commerciale"], description: "Carica le fatture (PDF e dati) e segui lo stato dei pagamenti." },
  { path: "utenti", label: "Utenti del team", icon: ClipboardList, roles: ["amministratore"], description: "Aggiungi o togli persone del team e impostane il ruolo." },
];

export const roleLabel: Record<TeamRole, string> = {
  amministratore: "Amministratore",
  operativo: "Operativo",
  commerciale: "Commerciale",
};
