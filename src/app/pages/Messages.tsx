import { PageHeader } from "@/app/AppLayout";
import { Spinner } from "@/components/common";
import { ChatThread, TeamLabel } from "@/components/chat/ChatThread";
import { Composer } from "@/components/chat/Composer";
import { useChat } from "@/components/chat/useChat";
import { useLinkedWork } from "@/components/chat/LinkedWorkChip";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/useQuery";
import type { Conversation } from "@/lib/types";

type Referent = { team_user_id: string; profiles: { full_name: string | null; job_title: string | null } | null };

/** Un'unica chat con il team (mockup C9). Il cliente vede anche chi lo segue. */
export function Messages() {
  const { profile } = useAuth();
  const conv = useQuery(async () => {
    const { data } = await supabase.from("conversations").select("*").limit(1).maybeSingle();
    let team: Referent[] = [];
    if (data?.company_id) {
      const r = await supabase.from("company_team").select("team_user_id, profiles(full_name, job_title)").eq("company_id", data.company_id);
      team = (r.data as unknown as Referent[]) ?? [];
    }
    return { conversation: data as Conversation | null, team };
  });
  const chat = useChat(conv.data?.conversation ?? null, profile?.id);
  const linked = useLinkedWork();

  return (
    <div className="pb-28">
      <PageHeader title="Messaggi" />
      <p className="-mt-4 mb-2 text-violetto">Un'unica chat con il team: risponde chi è disponibile.</p>
      {conv.data && conv.data.team.length > 0 && (
        <div className="mb-2 flex items-center gap-2 text-xs text-violetto">
          <span className="flex -space-x-2">
            {conv.data.team.map((t) => (
              <span key={t.team_user_id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-avorio bg-viola text-[11px] font-semibold text-white">
                {(t.profiles?.full_name ?? "?").charAt(0)}
              </span>
            ))}
          </span>
          Ti seguono {conv.data.team.map((t) => t.profiles?.full_name).filter(Boolean).join(" e ")}
        </div>
      )}

      {conv.loading || (conv.data?.conversation && chat.loading) ? (
        <Spinner />
      ) : !conv.data?.conversation ? (
        <p className="text-sm text-violetto">La chat non è ancora disponibile.</p>
      ) : (
        <>
          <ChatThread
            messages={chat.messages}
            people={chat.people}
            works={chat.works}
            urls={chat.urls}
            isOwnSide={(m) => m.author_id === profile?.id}
            leftLabel={(a) => <TeamLabel author={a} />}
            workHref={(id) => `/lavori/${id}`}
            emptyText="Scrivici qui: risponde chi del team è disponibile."
            bottomOffset={190}
          />
          {(
            <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-md px-4">
              <Composer top={linked.chip} onSend={async (b, f) => { await chat.send(b, f, linked.workId); linked.clear(); }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
