import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/BackButton";
import { ErrorText } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Domande provvisorie: la guida le lascia "da definire"
export const SURVEY_QUESTIONS = [
  "Quanto ti senti ascoltato?",
  "Quanto sei soddisfatto dei lavori che ti consegniamo?",
  "Quanto è semplice lavorare con noi tramite l'app?",
  "Quanto ci consiglieresti a chi conosci?",
];

/** Questionario di gradimento (mockup C14): una domanda alla volta, voto da 1 a 5, commento finale. */
export function Survey() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const last = step === SURVEY_QUESTIONS.length - 1;
  const vote = votes[step];

  async function submit() {
    setBusy(true);
    const answers = { domande: SURVEY_QUESTIONS.map((q, i) => ({ domanda: q, voto: votes[i] ?? null })), commento: comment.trim() || null };
    const { error } = await supabase.from("questionnaires").insert({ kind: "gradimento", user_id: profile!.id, company_id: profile!.company_id, answers });
    setBusy(false);
    if (error) return setError("Invio non riuscito. Riprova.");
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl">Grazie!</h1>
        <p className="text-violetto">Le tue risposte ci aiutano a lavorare meglio.</p>
        <Button asChild variant="accent" size="lg"><Link to="/il-mio-spazio">Torna a Il mio spazio</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="mb-5 flex items-center justify-between">
        <BackButton onClickOverride={step > 0 ? () => setStep(step - 1) : undefined} to={step === 0 ? "/il-mio-spazio" : undefined} />
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-viola">Domanda {step + 1} di {SURVEY_QUESTIONS.length}</p>
      </div>
      <div className="mb-6 flex gap-2">
        {SURVEY_QUESTIONS.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < step ? "bg-viola" : i === step ? "bg-arancione" : "bg-secondary")} />)}
      </div>
      <h1 className="mb-6 text-3xl leading-tight">Come ti stai trovando con noi?</h1>
      <Card className="p-5">
        <p className="mb-4 text-lg font-semibold text-viola">{SURVEY_QUESTIONS[step]}</p>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => { const v = [...votes]; v[step] = n; setVotes(v); }}
              aria-pressed={vote === n}
              aria-label={`Voto ${n}`}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full font-display text-xl transition",
                vote && n <= vote ? "bg-arancione text-viola" : "border-2 border-violetto text-viola",
                vote === n && "shadow-[0_0_0_8px_rgba(255,132,39,0.25)]",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-violetto"><span>Per niente</span><span>Moltissimo</span></div>
      </Card>
      {last && (
        <div className="mt-6 space-y-2">
          <p className="font-semibold text-viola">Vuoi dirci qualcosa in più?</p>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Scrivi qui, anche solo una riga" />
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="mt-auto space-y-3 pt-8 text-center">
        {last ? (
          <Button variant="accent" size="lg" className="w-full rounded-3xl text-lg" disabled={!vote || busy} onClick={submit}>{busy ? "Invio…" : "Invia"}</Button>
        ) : (
          <Button variant="accent" size="lg" className="w-full rounded-3xl text-lg" disabled={!vote} onClick={() => setStep(step + 1)}>Avanti</Button>
        )}
        <button onClick={() => navigate("/il-mio-spazio")} className="font-semibold text-viola underline underline-offset-4">Lo faccio più tardi</button>
      </div>
    </div>
  );
}
