# Gl0w-up — App cliente e backoffice

Repo di progetto per l'app **Gl0w-up** (agenzia di comunicazione): un'app per clienti e visitatori e un backoffice per il team, su un unico backend.
Questo README raccoglie il lavoro fatto finora (analisi, decisioni, domande aperte) per ripartire da Claude Code. C'è lo **scheletro dell'app** (React) e il **database** su Supabase (schema `glowup`).

> Stato: fase di analisi e documentazione. Tutta la gestione del progetto è su git (non su Lovable né Todoist).

## Cosa contiene il repo

| Percorso | Contenuto |
|---|---|
| `docs/App-Gl0w-up-Guida-per-lo-sviluppatore.pdf` | Guida per lo sviluppatore (18 pagine, 14/11/2026, a cura di Elisa) — fonte di verità sui requisiti |
| `docs/L-app-Gl0w-up-presentazione.pdf` | Presentazione per team e sviluppatore (17 pagine) |
| `docs/testo/guida-sviluppatore.txt` | Testo estratto dalla guida (leggibile da Claude Code) |
| `docs/testo/presentazione-app.txt` | Testo estratto dalla presentazione |
| `docs/mockup/` | 24 PNG: schermate cliente `C1–C14`, visitatore/primo avvio `V1–V7`, backoffice `T1–T2`, icona app |
| `docs/app-e-backoffice.md` | **Documento principale**: ruoli, chi entra dove, permessi, flussi, notifiche, dati, fasi, punti aperti |
| `docs/database.md` | Database: progetto Supabase, schema `glowup`, regole e passi manuali |
| `supabase/migrations/` | Migrazioni SQL già applicate al database |

## App (un solo sito, un solo progetto Cloudflare Pages)

**Online:** https://glowupcabegroup.pages.dev (Cloudflare Pages, deploy automatico a ogni push su `main`).


Un'unica app React. Cosa si vede dipende da **come** la si apre:

| Come si apre | Cosa si vede | Chi |
|---|---|---|
| **Browser**, home `/` | Pagina per **scaricare l'app** (pulsante nativo su Android/Chrome, istruzioni per iPhone, invito ad aprirla dal telefono su computer) + link "Accesso team" | Tutti |
| **Browser**, `/accedi` → `/admin` | Login e **backoffice**: dal browser accede **solo il team** (un cliente viene invitato a usare l'app) | Amministratore, Operativo, Commerciale |
| **App installata** (PWA) | "Sei già cliente?", accesso, registrazione e area clienti/visitatori | Cliente, Visitatore |

Il link d'invito del cliente arriva per mail e si apre nel browser: il cliente sceglie la password e viene mandato alla pagina per scaricare l'app.

Per provare l'area clienti dal browser (sviluppo): aprire `/?app=1` (torna normale con `/?app=0`).

Stack: Vite + React 18 + TypeScript + Tailwind + componenti shadcn/ui, Supabase (`@supabase/supabase-js`, schema `glowup`), PWA con `vite-plugin-pwa`. Font Poppins e Unbounded serviti dal sito stesso (niente Google Fonts, meglio per il GDPR).

```
src/
  app/          area clienti e visitatori (barra in basso, pagine)
  admin/        backoffice (barra laterale, sezioni)
  components/   componenti condivisi e shadcn/ui
  lib/          Supabase, accesso, tipi, utilità
supabase/       migrazioni del database ed Edge Functions
```

**Già funzionante:** benvenuto "Sei già cliente?", accesso, password dimenticata, scelta della password da invito, registrazione del visitatore con consensi, Home cliente con "Da fare per te", Lavori (contatori e filtri), Messaggi in tempo reale, Calendario, Consigli, Il mio spazio con uscita e cancellazione account, prenotazione della call del visitatore con orari liberi; backoffice con Panoramica e Clienti (crea azienda + invito). Le altre sezioni sono segnaposto.

### Sviluppo in locale

```bash
npm install
npm run dev
```

### Cloudflare Pages (un solo progetto)

| Impostazione | Valore |
|---|---|
| Framework preset | Nessuno (o Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (vuoto) |
| Node | 22 (dal file `.nvmrc`) |

L'URL di Supabase e la chiave *publishable* sono in `.env.production` (sono pubblici per natura: la sicurezza la fanno le regole RLS).

Configurazione già fatta (17/11/2026): segreti delle Edge Functions `GLOWUP_APP_URL = https://glowupcabegroup.pages.dev` e `GLOWUP_ADMIN_URL = https://glowupcabegroup.pages.dev/admin`. Mail e inviti via mail non servono per ora: gli inviti saranno gestiti dal codice.

## Il progetto in breve

- **App** (solo telefono, PWA per ora; store in seguito): usata da **Cliente** (un account per azienda) e **Visitatore** (chi scarica l'app senza essere cliente). Cinque schede: Home · Lavori · Messaggi (centrale) · Calendario · Il mio spazio.
- **Backoffice** (web + telefono): usato dal team — **Amministratore** (Elisa), **Operativo** (Angelo, Massimiliano), **Commerciale** (Marco Zanardi, Michele Calegaro). Il team non usa l'app cliente.
- **Cuore del servizio:** il cliente approva i lavori ("Approvo" / "Chiedo modifiche", con versioni e note sull'immagine), scrive all'agenzia in un'unica chat, vede appuntamenti, contratto, fatture (nessun pagamento in app) e consigli. Il metodo ha 4 step: Ascolto, Restituzione, Strategia, Consegna.
- **Brand:** viola `#492176`, lilla `#A36DE2`, violetto `#745196`, arancione `#FF8427`, prugna `#3F2951`, avorio `#F3F4EF`. Font: Poppins (interfaccia), **Unbounded** per i titoli (deciso; la guida indicava Monument Extended). Tutto in italiano, dando del "tu"; claim "You too can gl0w!".

## Stack

- **Backend:** Supabase (Auth, Postgres con RLS, Storage, Edge Functions), progetto in **regione UE** (GDPR). Progetto `ywsolxklcyctrezngclz`, **condiviso** con altre app: Gl0w-up vive nello schema **`glowup`** (dettagli in `docs/database.md`).
- **Frontend:** un solo sito su un solo progetto Cloudflare Pages, con l'app clienti/visitatori su `/` e il backoffice su `/admin`; React + TypeScript + Tailwind + shadcn/ui.
- **Hosting:** **Cloudflare Pages** per l'app (PWA) e per il backoffice.
- **Notifiche:** web push (su iPhone solo con PWA installata, iOS 16.4+) e mail transazionali con **Resend** (serve un dominio mittente verificato).
- **Store:** impacchettare la PWA (es. Capacitor) in un secondo momento. Account Apple/Google intestati all'azienda (2L Consulting S.r.l.s.).
- **Sicurezza:** un cliente vede solo i dati della propria azienda, con controllo lato server (RLS); link ai file a scadenza; registro delle azioni; backup.

## Decisioni prese

| Tema | Decisione |
|---|---|
| Incontro del visitatore | Telefono oppure in sede a **Legnago**; niente online (provvisorio) |
| Messaggi dei visitatori | Arrivano all'**amministratore**, che risponde; il commerciale resta in sola lettura (provvisorio) |
| Face ID e note sulle immagini | Entrano in **fase 1** (la guida le metteva in fase 2) |
| Giorni delle call | Lunedì–venerdì, 8–12 e 14–18, slot da 30 minuti, call da 10 a 30 minuti |
| Piattaforma iniziale | PWA prima, poi store |
| Gestione progetto | Tutto su GitHub (`pbaldassare/glowupcabegroup`) |
| Dominio | Non ancora deciso: per ora si usano gli indirizzi provvisori di Cloudflare Pages |
| Supabase | Progetto `ywsolxklcyctrezngclz` (UE), condiviso con altre app; Gl0w-up nello schema `glowup` |
| Hosting | Cloudflare Pages (app e backoffice) |
| Mail transazionali | Resend |
| Asset di brand | Provvisori, ricavati dai mockup; da sostituire con i file vettoriali definitivi |
| Servizi, pacchetti e account del team | Segnaposto (nomi e mail di prova), da sostituire prima del rilascio |
| Font dei titoli | Unbounded |

## Domande aperte (da chiudere)

**Da fornire (decisioni già prese, mancano i dati)**
1. **Supabase:** esporre lo schema `glowup` nella Data API e configurare i redirect URL (vedi `docs/database.md`).
2. **Dominio:** da scegliere prima del rilascio (i mockup mostrano `pannello.gl0w-up.com`); serve anche per verificare il mittente su Resend.
3. **Asset definitivi:** loghi vettoriali (SVG) di "gl0w up" e dell'icona, pattern ondulato, illustrazioni del metodo.
4. **Dati reali:** elenco degli **8 servizi e 4 pacchetti** (Business, Comfort, Smart, Creative, su misura) e mail dei membri del team.

**Da decidere più avanti**
5. Chi segna una fattura come "Pagata"? Promemoria di scadenza: sì/no e quanti giorni prima?
6. Domande e frequenza del questionario di gradimento (nei mockup: 4 domande, voto 1–5 + commento).
7. Collegamento con il calendario Outlook del commerciale.
8. Cosa fare del modulo attuale sul sito.
9. Permessi non specificati dalla guida (marcati "proposta" in `docs/app-e-backoffice.md`): lettura dell'Operativo su clienti e questionari, scrittura bozze Consigli, ecc.

## Discrepanze trovate tra guida e mockup

- Incontro: la guida dice "in agenzia o online", il mockup "al telefono / in sede a Legnago" → deciso Legnago.
- Face ID e note posizionate: in fase 2 nella guida, già disegnate nei mockup → portate in fase 1.
- Centro notifiche (campanello in Home): presente nei mockup, non descritto nella guida.
- Schede Consigli: i mockup hanno categoria, minuti di lettura e 3 punti numerati, assenti dal modello dati.
- Intestazione "Cliente da [mese anno]": serve la data di inizio rapporto.
- I calendari nei mockup usano date del 2025 (es. 1° novembre di sabato): sono solo esempi.

## Schermate non ancora disegnate

Contratto, Servizi attivi, Archivio lavori, Materiali condivisi, Impostazioni, consenso privacy, passi 1 e 3–5 del questionario, password da invito / recupero, centro notifiche, tutte le altre schermate del backoffice (Clienti, Calendario, Messaggi, Consigli, Fatture, Utenti, Richieste visitatori) e il backoffice da telefono.

## Fasi

- **Fase 1:** accesso e inviti, area visitatori e prenotazione call, Home, Lavori con approvazione/versioni/note sulle immagini, Messaggi, Calendario, Il mio spazio, backoffice per tutto questo, notifiche principali, sblocco biometrico.
- **Fase 2:** prenotazione analisi strategica nell'app, Consigli con editor, modalità scura.
- **Fase 3:** report con numeri per cliente, collegamento Consigli–sito, altre lingue.
- **Fuori ambito:** gestione ore e commesse, più utenti per la stessa azienda, pagamento fatture in app.

## Cronologia del lavoro (sintesi)

1. Collegato il repo `pbaldassare/glowupcabegroup` (account personale, repo inizialmente vuoto) alla sessione.
2. Analizzati i due PDF (guida e presentazione) senza scrivere nulla; riepilogo di sistema, ruoli, flussi, dati e requisiti.
3. Discussa la parte tecnica: Supabase, PWA, backoffice e app separati su backend unico.
4. Caricati i PDF in `docs/`, poi i 24 mockup in `docs/mockup/` e analizzate tutte le schermate.
5. Scritto `docs/app-e-backoffice.md` (chi entra dove, permessi, flussi, notifiche, punti aperti).
6. Registrate le decisioni su sede a Legnago, messaggi visitatori all'amministratore, Face ID e note in fase 1.
7. Salvati nel repo il testo dei PDF e questo README per ripartire da Claude Code.

## Prossimi passi

1. Rispondere alle domande 1–6 sopra.
2. Impostare lo scheletro del repo (monorepo `app` + `admin`) e il progetto Supabase.
3. Schema del database con ruoli e RLS (la parte critica: isolamento dei dati per cliente).
4. App cliente (da progettare per prima), poi backoffice.
