// API lato server di Gl0w-up. Un percorso per azione:
//   POST /functions/v1/glowup-api/invite           amministratore: invita cliente o membro del team
//   POST /functions/v1/glowup-api/convert-visitor  amministratore: visitatore -> cliente
//   POST /functions/v1/glowup-api/slots            orari liberi per la call
//   POST /functions/v1/glowup-api/book-call        visitatore: prenota la call
//   POST /functions/v1/glowup-api/delete-account   cancella il proprio account
import { HttpError, serve } from "../_shared/glowup.ts";
import { handler as invite } from "./handlers/invite.ts";
import { handler as convertVisitor } from "./handlers/convert-visitor.ts";
import { handler as slots } from "./handlers/slots.ts";
import { handler as bookCall } from "./handlers/book-call.ts";
import { handler as deleteAccount } from "./handlers/delete-account.ts";

const routes: Record<string, (req: Request) => Promise<Response>> = {
  "invite": invite,
  "convert-visitor": convertVisitor,
  "slots": slots,
  "book-call": bookCall,
  "delete-account": deleteAccount,
};

serve((req) => {
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const route = routes[action];
  if (!route) throw new HttpError(404, "Azione sconosciuta");
  return route(req);
});
