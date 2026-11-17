/** Questionario conoscitivo del visitatore (guida pag. 3 e mockup V3). */
export const NEEDS = ["Sito", "Social", "Foto e video", "Pubblicità", "Branding", "Stampa"];

export type KnowAnswers = {
  nome?: string; azienda?: string; settore?: string;
  bisogni?: string[]; modalita?: "telefono" | "in_sede";
  telefono?: string; mail?: string; note?: string;
};

export type SurveyAnswers = { domande?: { domanda: string; voto: number | null }[]; commento?: string | null };
