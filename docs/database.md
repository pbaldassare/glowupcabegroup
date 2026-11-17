# Gl0w-up — Database (Supabase)

## Dove sta

- **Progetto Supabase:** `ywsolxklcyctrezngclz` (`https://ywsolxklcyctrezngclz.supabase.co`), regione `eu-west-1` (Irlanda, UE), Postgres 17.
- **Sezione di Gl0w-up:** schema **`glowup`**. Tutte le tabelle dell'app e del backoffice vanno lì.
- Il progetto è **condiviso** con altre app, ciascuna nel proprio schema: `public` (piattaforma agenti/workspace "alter ego"), `ia_connect`, `learning`. **Non toccare** quegli schemi.

## Cosa è già stato fatto (17/11/2026)

| Migrazione | Effetto |
|---|---|
| `glowup_schema` | Crea lo schema `glowup`. Accesso solo a `authenticated` e `service_role` (niente `anon`, si aggiunge se servirà). Privilegi predefiniti per le tabelle future; le righe le decide la RLS |
| `glowup_skip_public_user_triggers` | Gli utenti con metadato `app = 'glowup'` non ricevono profilo e workspace in `public` (prima ogni nuovo utente diventava `client_owner` di un workspace "alter ego"). Per gli altri utenti nulla cambia. Verificato con un test annullato |

I file SQL sono in `supabase/migrations/`.

## Regole per Gl0w-up

1. **Ogni utente Gl0w-up va creato con `app = 'glowup'`:**
   - clienti e team (creati dal backoffice tramite Edge Function con `service_role`): in `app_metadata` → `{ "app": "glowup" }`;
   - visitatori (registrazione dall'app): in `options.data` del `signUp` → `{ "app": "glowup" }`.
2. **RLS su ogni tabella** di `glowup`, con isolamento per azienda cliente (un cliente vede solo la propria azienda) e ruoli del team (amministratore, operativo, commerciale) letti da tabelle di `glowup`, mai dai metadati modificabili dall'utente.
3. **Ruoli e accesso:** il fatto che un utente "esista" in Auth non basta: l'app e il backoffice controllano che abbia una riga in `glowup` (profilo cliente, visitatore o membro del team).
4. **File:** bucket dedicati con prefisso `glowup-` (privati, link firmati a scadenza).
5. **Funzioni server:** Edge Functions con prefisso `glowup-`.

## Da fare a mano nella dashboard Supabase

- **Esporre lo schema all'API:** Settings → API (Data API) → *Exposed schemas* → aggiungere `glowup`. Senza questo il frontend non può leggere le tabelle.
- **Redirect URL di Auth:** aggiungere gli indirizzi dell'app e del backoffice (Cloudflare Pages) in Authentication → URL Configuration.

## Limiti del progetto condiviso (accettati)

- Un solo elenco utenti (Auth) per tutte le app: un account Gl0w-up esiste anche per le altre app; devono essere quelle a negargli l'accesso.
- Mail di Auth (invito, recupero password), mittente SMTP e "Site URL" sono **unici** per tutto il progetto.
- Backup, ripristino e limiti del piano sono comuni a tutte le app.
- Il controllo di sicurezza di Supabase segnala problemi nelle altre app (funzioni `SECURITY DEFINER` chiamabili da `anon`/`authenticated`, protezione password trapelate spenta): non riguardano `glowup` ma conviene sistemarli.
