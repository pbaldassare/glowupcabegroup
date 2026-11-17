import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { ErrorText, Spinner } from "@/components/common";
import { WorkStatusBadge } from "@/components/StatusBadge";
import { FileStage } from "@/components/works/FileStage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { formatDate, relativeDay } from "@/lib/utils";
import { useWork } from "./useWork";

/** Dettaglio del lavoro (mockup C4): anteprima, nota del team, Approvo / Chiedo modifiche. */
export function WorkView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const q = useWork(id);
  const [showOld, setShowOld] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (q.loading) return <div className="p-6"><Spinner /></div>;
  if (!q.data) return <div className="p-6"><BackButton to="/lavori" /><ErrorText>{q.error}</ErrorText></div>;
  const { work, versions, feedback, urls, people } = q.data;
  const current = versions[0];
  const author = current?.uploaded_by ? people[current.uploaded_by] : undefined;
  const note = current?.team_note ?? work.client_note;

  async function approve() {
    if (!current) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("feedback").insert({ version_id: current.id, work_id: work.id, company_id: work.company_id, author_id: profile!.id, outcome: "approvato" });
    setBusy(false);
    if (error) return setError("Non siamo riusciti a registrare l'approvazione. Riprova.");
    navigate(`/lavori/${work.id}/approvato`, { replace: true });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="mb-5 flex items-center justify-between">
        <BackButton to="/lavori" />
        <WorkStatusBadge status={work.status} className="px-4 py-1.5 text-sm" />
      </div>

      <FileStage files={current?.files ?? []} urls={urls} />

      <h1 className="mt-5 text-2xl leading-tight">{work.title}</h1>
      <p className="mt-1 text-violetto">
        {[work.projects?.title ?? work.kind, current && `Versione ${current.number}`, current?.sent_at && `inviato ${relativeDay(current.sent_at)}`].filter(Boolean).join(" · ")}
      </p>

      {note && (
        <Card className="mt-5 flex gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-viola font-semibold text-white">{(author?.full_name ?? "G").charAt(0)}</span>
          <div>
            <p className="text-sm font-semibold text-viola">{author?.full_name ?? "Team"} · Gl<span className="text-arancione">0</span>w-up</p>
            <p className="text-prugna">{note}</p>
          </div>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>

      {work.status === "da_approvare" && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="accent" size="lg" className="rounded-3xl text-lg" onClick={approve} disabled={busy}><Check className="!size-5" /> Approvo</Button>
          <Button variant="outline" size="lg" className="rounded-3xl border-viola px-3 text-base" asChild>
            <Link to={`/lavori/${work.id}/modifiche`}>Chiedo modifiche</Link>
          </Button>
        </div>
      )}
      {work.status === "in_modifica" && (
        <p className="mt-5 rounded-3xl bg-secondary p-4 text-viola">Hai chiesto delle modifiche: stiamo preparando la nuova versione. Ti avvisiamo noi.</p>
      )}
      {work.status === "approvato" && (
        <p className="mt-5 rounded-3xl bg-secondary p-4 text-viola">Lavoro approvato. Lo trovi anche nell'archivio di Il mio spazio.</p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        {versions.length > 1 && (
          <button onClick={() => setShowOld((s) => !s)} className="font-semibold text-viola underline underline-offset-4">
            {showOld ? "Nascondi le versioni precedenti" : "Vedi le versioni precedenti"}
          </button>
        )}
        <Link to={`/messaggi?lavoro=${work.id}`} className="flex items-center gap-2 text-sm font-semibold text-viola">
          <MessageSquareText className="h-4 w-4" /> Scrivici su questo lavoro
        </Link>
      </div>

      {showOld && (
        <div className="mt-6 space-y-6">
          {versions.slice(1).map((v) => {
            const fbs = feedback.filter((f) => f.version_id === v.id);
            return (
              <div key={v.id}>
                <p className="mb-2 font-semibold text-viola">Versione {v.number} <span className="font-normal text-violetto">· {v.sent_at && formatDate(v.sent_at, { day: "numeric", month: "long" })}</span></p>
                <FileStage files={v.files} urls={urls} pins={fbs.flatMap((f) => f.pins ?? [])} />
                {fbs.map((f) => (
                  <p key={f.id} className="mt-2 text-sm text-prugna">
                    <b className="text-viola">{f.outcome === "approvato" ? "Approvata" : "Le tue modifiche"}:</b>{" "}
                    {[...(f.pins ?? []).map((p, i) => `${i + 1}. ${p.text}`), f.comment].filter(Boolean).join(" · ") || "—"}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
