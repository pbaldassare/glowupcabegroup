# Gl0w-up — Database (Supabase)

## Dove sta

- **Progetto Supabase:** `ywsolxklcyctrezngclz` (`https://ywsolxklcyctrezngclz.supabase.co`), regione `eu-west-1` (Irlanda, UE), Postgres 17.
- **Sezione di Gl0w-up:** schema **`glowup`**. Tutte le tabelle dell'app e del backoffice vanno lì.
- Il progetto è **condiviso** con altre app, ciascuna nel proprio schema: `public` (piattaforma agenti/workspace "alter ego"), `ia_connect`, `learning`. **Non toccare** quegli schemi.

## Cosa è già stato fatto (17/11/2026)

| Migrazione | Effetto |
|---|---|
| `glowup_schema` | Crea lo schema `glowup`. Accesso solo a `authenticated` e `service_role` (niente `anon`) |
| `glowup_skip_public_user_triggers` | Gli utenti con `app = 'glowup'` non ricevono profilo e workspace di "alter ego" in `public` |
| `glowup_tables` | 23 tabelle della fase 1, tipi, indici, RLS attiva ovunque, pacchetti e 8 servizi segnaposto |
| `glowup_security` | Schema `glowup_private` (funzioni per le regole, **da non esporre**), automazioni e regole di sicurezza |
| `glowup_storage` | 5 bucket privati `glowup-*` e le loro regole |
| `glowup_policies_split` | Regole separate per lettura e scrittura (consiglio prestazioni di Supabase) |
| `glowup_notifications` | Notifiche automatiche sugli eventi; la call del visitatore si prenota solo tramite `glowup-api/book-call` |
| `glowup_keep_history` | Se un utente cancella l'account, messaggi e riscontri restano nello storico senza autore |
| `glowup_dispatch_cron` | Estensioni `pg_cron` e `pg_net`; `glowup-dispatch` parte ogni 5 minuti (job `glowup-dispatch`); segreto `glowup_cron_secret` nel Vault |
| `glowup_chat` | Tabella `company_team` (**referenti** del cliente: chi del team gestisce i suoi progetti) e anteprima dell'ultimo messaggio in `conversations`; i messaggi del cliente avvisano i suoi referenti e l'amministratore (tutto il team se non ha referenti) |

I file SQL sono in `supabase/migrations/`.

### Tabelle

| Area | Tabelle |
|---|---|
| Persone | `profiles` (cliente / visitatore / team, con ruolo), `visitors`, `availability` (fasce del commerciale) |
| Aziende | `companies`, `contracts`, `company_services`, `services`, `packages`, `invoices` |
| Lavoro | `projects` (step del metodo), `works`, `work_versions`, `feedback` (Approvo / Chiedo modifiche + note posizionate in `pins`) |
| Agenda | `appointments` (di un'azienda oppure di un visitatore) |
| Messaggi | `conversations` (una per azienda e una per visitatore, create in automatico), `messages`, `conversation_reads` |
| Altro | `tips` (Consigli), `questionnaires`, `shared_files`, `notifications`, `push_subscriptions`, `audit_log` |

### Automazioni

- **Nuovo utente** con `app = 'glowup'` → profilo in `glowup.profiles`. Tipo e ruolo arrivano **solo** da `app_metadata` (scrivibile solo dal server): chi si registra da solo è sempre *visitatore*.
- **Protezioni:** un utente non può cambiarsi tipo, ruolo, azienda o stato; un visitatore non può cambiarsi l'esito.
- **Versioni:** numero progressivo automatico, autore = chi carica.
- **Riscontro del cliente:** accettato solo sull'ultima versione inviata di un lavoro *da approvare*; poi il lavoro passa ad *approvato* (archiviato) o *in modifica*.
- **Registro delle azioni** su aziende, contratti, servizi, fatture, progetti, lavori, versioni, riscontri, appuntamenti, visitatori, consigli e cambi di ruolo.
- `messages` e `notifications` sono in **tempo reale** (Realtime).

### Chi fa cosa (verificato con utenti di prova, poi annullati)

| | Amministratore | Operativo | Commerciale | Cliente | Visitatore |
|---|---|---|---|---|---|
| Aziende | gestisce | legge | legge | la propria | — |
| Contratti, servizi, fatture | gestisce | — | legge | i propri (lettura) | — |
| Progetti, lavori, versioni | gestisce | gestisce | legge | i propri, **senza bozze** né versioni non inviate | — |
| Approvo / Chiedo modifiche | — | — | — | sì, solo sull'ultima versione | — |
| Appuntamenti | gestisce | gestisce | fissa, sposta, annulla | vede i propri, non li crea | prenota la propria call *da confermare* |
| Messaggi clienti | scrive | scrive | legge | la propria conversazione | — |
| Messaggi visitatori | scrive | — | legge | — | la propria conversazione |
| Consigli | pubblica | solo bozze | legge | pubblicati | pubblicati |
| Questionari | legge | legge | legge | i propri | i propri |
| Registro azioni | legge | — | — | — | — |

Clienti con rapporto chiuso: sola lettura per 3 mesi (`companies.status = 'chiuso'` e `closed_at`), poi niente accesso.

### File (bucket privati, link firmati a scadenza)

| Bucket | Percorso | Chi |
|---|---|---|
| `glowup-lavori` | `<company_id>/<work_id>/...` | team legge, amministratore e operativo caricano, cliente legge i propri |
| `glowup-documenti` | `<company_id>/contratti` o `fatture/...` | amministratore gestisce, commerciale legge, cliente legge i propri |
| `glowup-condivisi` | `<company_id>/<cartella>/...` | team; il cliente legge e carica nella propria cartella |
| `glowup-messaggi` | `<company_id>/...` o `visitatori/<user_id>/...` | come le conversazioni |
| `glowup-consigli` | `...` | chi usa Gl0w-up legge, amministratore e operativo caricano |

## Regole per Gl0w-up

1. **Ogni utente Gl0w-up va creato con `app = 'glowup'`:**
   - clienti e team (creati dal backoffice tramite Edge Function con `service_role`): in `app_metadata` → `{ "app": "glowup" }`;
   - visitatori (registrazione dall'app): in `options.data` del `signUp` → `{ "app": "glowup" }`.
2. **RLS su ogni tabella** di `glowup`, con isolamento per azienda cliente (un cliente vede solo la propria azienda) e ruoli del team (amministratore, operativo, commerciale) letti da tabelle di `glowup`, mai dai metadati modificabili dall'utente.
3. **Ruoli e accesso:** il fatto che un utente "esista" in Auth non basta: l'app e il backoffice controllano che abbia una riga in `glowup` (profilo cliente, visitatore o membro del team).
4. **File:** bucket dedicati con prefisso `glowup-` (privati, link firmati a scadenza).
5. **Funzioni server:** Edge Functions con prefisso `glowup-`.

## Da fare a mano nella dashboard Supabase

- **Esporre lo schema all'API:** Settings → API (Data API) → *Exposed schemas* → aggiungere `glowup` (**non** `glowup_private`). Senza questo il frontend non può leggere le tabelle.
- **Redirect URL di Auth:** aggiungere gli indirizzi dell'app e del backoffice (Cloudflare Pages) in Authentication → URL Configuration.

## Notifiche automatiche

Nascono nel database (tabella `notifications`, il centro notifiche dell'app) a ogni evento; `glowup-dispatch` poi spedisce push e mail.

| Evento | Chi la riceve | Mail |
|---|---|---|
| Lavoro inviato al cliente (anche nuova versione) | cliente | sì |
| Approvo / Chiedo modifiche | amministratore, operativo | no |
| Messaggio dall'agenzia | cliente o visitatore | no |
| Messaggio da un cliente | i suoi referenti + amministratore (tutto il team se non ha referenti) | no |
| Messaggio da un visitatore | amministratore, commerciale | no |
| Appuntamento creato, confermato, spostato, annullato | cliente o visitatore | sì |
| Nuova richiesta di call da un visitatore | amministratore, commerciale | sì |
| Promemoria il giorno prima (appuntamenti confermati) | cliente o visitatore | no |
| Consiglio pubblicato | tutti i clienti | no |
| Nuova fattura | cliente | sì |
| Questionario compilato | amministratore, commerciale | sì |

Chi fa l'azione non riceve la propria notifica. Ogni utente può spegnere un tipo di notifica con `profiles.notification_prefs`, per esempio `{"consiglio": false}`.

## Funzioni lato server (Edge Functions)

Codice in `supabase/functions/`. Tutte rispondono solo a `POST` e restituiscono JSON (`{ "error": "..." }` in caso di errore).

### `glowup-api` (serve l'accesso dell'utente)

| Percorso | Chi | Body | Cosa fa |
|---|---|---|---|
| `/glowup-api/invite` | amministratore | `{ kind: "cliente"\|"team", email, full_name?, company_id?, team_role? }` | Crea l'account e manda la mail "Imposta la password" (se Resend non è configurato restituisce il link da inoltrare) |
| `/glowup-api/convert-visitor` | amministratore | `{ visitor_user_id, company_id? \| company? }` | Alla firma: crea l'azienda, trasforma il visitatore in cliente, collega il questionario |
| `/glowup-api/slots` | utenti Gl0w-up | `{ from?: "YYYY-MM-DD", days?: 14 }` | Orari liberi del commerciale (lun–ven, fasce di `availability`, almeno 2 ore di anticipo) |
| `/glowup-api/book-call` | visitatore | `{ starts_at, mode: "telefono"\|"in_sede" }` | Prenota la call su uno slot ancora libero, *da confermare*; una sola call aperta per visitatore |
| `/glowup-api/delete-account` | cliente, visitatore | `{ confirm: true }` | Cancella l'account (requisito degli store); i dati dell'azienda restano all'agenzia |

Dal frontend: `supabase.functions.invoke("glowup-api/slots", { body: {...} })`.

### `glowup-dispatch` (attività pianificata)

Crea i promemoria del giorno dopo e spedisce push e mail delle notifiche in coda. Va chiamata ogni 5 minuti con l'header `x-cron-secret` (oppure con la service_role key). Senza le chiavi di push o di Resend segna le notifiche come elaborate e non spedisce nulla.

### Segreti da impostare (Edge Functions → Secrets)

| Nome | Serve per | Obbligatorio |
|---|---|---|
| `GLOWUP_APP_URL`, `GLOWUP_ADMIN_URL` | Link nelle mail e negli inviti | **impostati** (`https://glowupcabegroup.pages.dev` e `.../admin`) |
| `RESEND_API_KEY`, `GLOWUP_MAIL_FROM` | Mail (es. `Gl0w-up <ciao@dominio>`, dominio verificato su Resend) | rimandato: per ora niente mail |
| `GLOWUP_VAPID_PUBLIC_KEY`, `GLOWUP_VAPID_PRIVATE_KEY`, `GLOWUP_VAPID_SUBJECT` | Notifiche push (chiavi da `npx web-push generate-vapid-keys`) | per le push |
| `GLOWUP_CRON_SECRET` | Protegge `glowup-dispatch` | sì, per pianificarla |
| `GLOWUP_ALLOWED_ORIGIN` | Limita le chiamate al dominio dell'app (predefinito `*`) | consigliato |

### Ancora da fare

- **Collegare il segreto della pianificazione:** `glowup-dispatch` è già pianificata ogni 5 minuti, ma risponde "Non autorizzato" finché il valore di `glowup_cron_secret` (Vault) non viene copiato nei segreti delle Edge Functions come `GLOWUP_CRON_SECRET`.
- Disattivazione automatica degli account a 3 mesi dalla chiusura del rapporto (oggi la RLS già nega l'accesso, ma l'account resta).
- Lettura dei Consigli programmati: la notifica parte quando il consiglio diventa *pubblicato*, non alla data di `publish_at`.

## Limiti del progetto condiviso (accettati)

- Un solo elenco utenti (Auth) per tutte le app: un account Gl0w-up esiste anche per le altre app; devono essere quelle a negargli l'accesso.
- Mail di Auth (invito, recupero password), mittente SMTP e "Site URL" sono **unici** per tutto il progetto.
- Backup, ripristino e limiti del piano sono comuni a tutte le app.
- Il controllo di sicurezza di Supabase segnala problemi nelle altre app (funzioni `SECURITY DEFINER` chiamabili da `anon`/`authenticated`, protezione password trapelate spenta): non riguardano `glowup` ma conviene sistemarli.
