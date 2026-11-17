import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lightbulb, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/BackButton";
import { ErrorText } from "@/components/common";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NEEDS, type KnowAnswers } from "@/lib/questionnaire";

export const SKIP_KEY = "glowup-questionario-dopo";
const TOTAL = 5;

/** Questionario conoscitivo (mockup V3): 5 passi, si può rimandare. */
export function VisitorQuestionnaire() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [a, setA] = useState<KnowAnswers>({ nome: profile?.full_name ?? "", mail: profile?.email ?? "", bisogni: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function later() {
    try { localStorage.setItem(SKIP_KEY, "1"); } catch { /* ignora */ }
    navigate("/", { replace: true });
  }

  async function finish() {
    setBusy(true);
    setError("");
    const { error } = await supabase.from("questionnaires").insert({ kind: "conoscitivo", user_id: profile!.id, answers: a });
    if (!error) {
      await supabase.from("visitors").update({ full_name: a.nome || profile!.full_name, company_name: a.azienda || null, sector: a.settore || null, phone: a.telefono || null }).eq("user_id", profile!.id);
      try { localStorage.removeItem(SKIP_KEY); } catch { /* ignora */ }
    }
    setBusy(false);
    if (error) return setError("Non siamo riusciti a salvare le risposte. Riprova.");
    navigate("/?fatto=1", { replace: true, state: { mode: a.modalita } });
  }

  const canNext =
    step === 1 ? !!a.nome?.trim() :
    step === 2 ? !!a.bisogni?.length :
    step === 3 ? !!a.modalita :
    step === 4 ? !!(a.telefono?.trim() || a.mail?.trim()) : true;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="mb-6 flex items-center justify-between">
        <BackButton onClickOverride={() => (step > 1 ? setStep(step - 1) : later())} />
        <button onClick={later} className="font-semibold text-viola underline underline-offset-4">Lo faccio più tardi</button>
      </div>
      <div className="mb-2 flex justify-between font-mono text-xs uppercase tracking-[0.2em]">
        <span className="text-violetto">Questionario conoscitivo</span><span className="text-viola">{step} di {TOTAL}</span>
      </div>
      <div className="mb-8 flex gap-2">
        {Array.from({ length: TOTAL }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i + 1 < step ? "bg-viola" : i + 1 === step ? "bg-arancione" : "bg-secondary")} />)}
      </div>

      {step === 1 && (
        <Step title="Piacere di conoscerti" text="Raccontaci chi sei, così arriviamo preparati alla call.">
          <Input placeholder="Nome e cognome" value={a.nome} onChange={(e) => setA({ ...a, nome: e.target.value })} aria-label="Nome e cognome" />
          <Input placeholder="Azienda" value={a.azienda ?? ""} onChange={(e) => setA({ ...a, azienda: e.target.value })} aria-label="Azienda" />
          <Input placeholder="Settore (es. ristorazione, moda, artigianato)" value={a.settore ?? ""} onChange={(e) => setA({ ...a, settore: e.target.value })} aria-label="Settore" />
        </Step>
      )}
      {step === 2 && (
        <Step title="Di cosa hai bisogno?" text="Puoi sceglierne più di uno. Ne parliamo meglio nella call.">
          <div className="flex flex-wrap gap-3">
            {NEEDS.map((n) => {
              const on = a.bisogni?.includes(n);
              return (
                <button key={n} onClick={() => setA({ ...a, bisogni: on ? a.bisogni!.filter((x) => x !== n) : [...(a.bisogni ?? []), n] })} aria-pressed={on}
                  className={cn("flex items-center gap-2 rounded-full px-6 py-4 text-lg font-semibold", on ? "bg-viola text-white" : "border-2 border-violetto/60 text-viola")}>
                  {on && <Check className="h-5 w-5 text-arancione" />}{n}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3 rounded-3xl border border-dashed border-violetto/50 p-4 text-violetto">
            <Lightbulb className="h-5 w-5 shrink-0" />
            <p>Non sai da dove partire? Scegli quello che ti sembra più urgente: al resto pensiamo insieme.</p>
          </div>
        </Step>
      )}
      {step === 3 && (
        <Step title="Come preferisci incontrarci?" text="La call conoscitiva dura da 10 a 30 minuti.">
          {([["telefono", "Al telefono", Phone], ["in_sede", "In presenza, nella nostra sede di Legnago", Building2]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setA({ ...a, modalita: k })} className={cn("flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left text-lg font-semibold", a.modalita === k ? "border-viola bg-viola text-white" : "border-border text-viola")}>
              <Icon className={cn("h-6 w-6", a.modalita === k ? "text-arancione" : "text-violetto")} />{label}
            </button>
          ))}
        </Step>
      )}
      {step === 4 && (
        <Step title="Come ti contattiamo?" text="Ti scriviamo solo per la call e per rispondere alle tue domande.">
          <Input type="tel" placeholder="Telefono" value={a.telefono ?? ""} onChange={(e) => setA({ ...a, telefono: e.target.value })} aria-label="Telefono" />
          <Input type="email" placeholder="Mail" value={a.mail ?? ""} onChange={(e) => setA({ ...a, mail: e.target.value })} aria-label="Mail" />
        </Step>
      )}
      {step === 5 && (
        <Step title="Vuoi dirci qualcosa in più?" text="Facoltativo: un obiettivo, una scadenza, un sito che ti piace.">
          <Textarea placeholder="Scrivi qui, anche solo una riga" value={a.note ?? ""} onChange={(e) => setA({ ...a, note: e.target.value })} aria-label="Note" />
        </Step>
      )}

      <ErrorText>{error}</ErrorText>
      <div className="mt-auto grid grid-cols-[1fr_2fr] gap-3 pt-8">
        <Button variant="outline" size="lg" className="rounded-3xl border-viola" disabled={step === 1} onClick={() => setStep(step - 1)}>Indietro</Button>
        {step < TOTAL ? (
          <Button variant="accent" size="lg" className="rounded-3xl text-lg" disabled={!canNext} onClick={() => setStep(step + 1)}>Avanti</Button>
        ) : (
          <Button variant="accent" size="lg" className="rounded-3xl text-lg" disabled={busy} onClick={finish}>{busy ? "Invio…" : "Invia"}</Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="mb-3 text-3xl leading-tight">{title}</h1>
      <p className="mb-6 text-violetto">{text}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
