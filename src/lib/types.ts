export type ProfileKind = "cliente" | "visitatore" | "team";
export type TeamRole = "amministratore" | "operativo" | "commerciale";

export type Profile = {
  id: string;
  kind: ProfileKind;
  team_role: TeamRole | null;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  active: boolean;
};

export type WorkStatus = "bozza" | "da_approvare" | "in_modifica" | "approvato";

export type Work = {
  id: string;
  title: string;
  kind: string | null;
  status: WorkStatus;
  client_note: string | null;
  created_at: string;
  company_id: string;
  companies?: { legal_name: string; trade_name: string | null } | null;
};

export type Appointment = {
  id: string;
  type: "consegna" | "call" | "incontro" | "shooting" | "analisi_strategica";
  title: string;
  starts_at: string;
  duration_min: number;
  status: "da_confermare" | "confermato" | "annullato";
  mode: string | null;
  location: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  author_id: string | null;
  body: string | null;
  created_at: string;
};

export const workStatusLabel: Record<WorkStatus, string> = {
  bozza: "Bozza",
  da_approvare: "Da approvare",
  in_modifica: "In modifica",
  approvato: "Approvato",
};

export const stepLabel: Record<string, string> = {
  ascolto: "Ascolto",
  restituzione: "Restituzione",
  strategia: "Strategia",
  consegna: "Consegna",
};
