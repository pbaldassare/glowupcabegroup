# Gl0w-up — App e backoffice: ruoli, accessi e funzioni

Documento di lavoro che riassume la *Guida per lo sviluppatore* e i mockup (cartella `docs/mockup/`).
Le parti marcate **(proposta)** sono nostre assunzioni, non scritte nella guida: da confermare.

## 1. Il sistema in breve

Due superfici su un unico backend (Supabase, UE):

| Superficie | Cos'è | Chi la usa | Dispositivo |
|---|---|---|---|
| **App** | Area clienti e visitatori (PWA, poi store) | Cliente, Visitatore | Solo telefono |
| **Backoffice** | Pannello con cui l'agenzia alimenta tutto ciò che il cliente vede | Amministratore, Operativo, Commerciale | Web (uso principale) e telefono |

**Regola semplice:** i clienti e chi non è ancora cliente entrano nell'**app**; chi lavora in agenzia entra nel **backoffice**. Il team non usa l'app cliente.

## 2. Chi entra dove

| Ruolo | Chi | App | Backoffice | Account |
|---|---|---|---|---|
| Cliente | Un account per azienda | Sì | No | Creato dal team, invito via mail |
| Visitatore | Chiunque scarichi l'app | Sì (area ridotta) | No | Si registra da solo per confermare la call |
| Amministratore | Elisa | No | Sì, tutto | Personale |
| Operativo | Angelo, Massimiliano | No | Sì, limitato | Personale |
| Commerciale | Marco Zanardi, Michele Calegaro | No | Sì, sola lettura + appuntamenti | Personale |

Regole di accesso:
- **Un account per azienda cliente.** Niente più utenti per la stessa azienda (fuori ambito).
- L'account cliente lo attiva **sempre il team**; se la persona era già visitatore, il team trasforma quell'account in cliente (nessuna nuova registrazione, il questionario resta).
- **Isolamento dei dati:** un cliente non vede mai dati di un altro cliente, nemmeno cambiando URL. Controllo lato server (RLS), non solo nell'interfaccia.
- **Fine rapporto:** 3 mesi di sola lettura (archivio lavori, contratto, fatture), poi disattivazione automatica.
- Un account del team che prova ad accedere all'app, o un cliente al backoffice, viene respinto in base al ruolo **(proposta)**.

## 3. App (clienti e visitatori)

Barra in basso, cinque voci: **Home · Lavori · Messaggi (centrale, in evidenza) · Calendario · Il mio spazio**.

### 3.1 Primo avvio
- Splash → "Sei già cliente?" con due strade:
  - **Sì, accedi:** mail e password, "Password dimenticata", Face ID opzionale (nel mockup c'è già).
  - **Non ancora:** questionario conoscitivo, poi prenotazione della call.

### 3.2 Visitatore
1. Questionario conoscitivo in 5 passi: nome, azienda, settore, di cosa ha bisogno (sito, social, foto e video, pubblicità, branding, stampa), modalità, contatti. Consenso privacy obbligatorio, marketing facoltativo. Si può saltare ("Lo faccio più tardi").
2. Prenotazione: sceglie *Al telefono* o *In presenza (sede a Legnago)*, un giorno (lun–ven) e uno slot libero del commerciale (8–12 e 14–18, call da 10 a 30 minuti).
3. Crea un accesso (mail e password) per ricevere conferma e promemoria.
4. Conferma: "Grazie. Ti aspettiamo [giorno] alle [ora]", con "Aggiungi al mio calendario" e "Scrivici".

Cosa vede il visitatore:
- Dopo la prenotazione: **La tua richiesta · Messaggi · Consigli**.
- Se salta il questionario: solo **Consigli** e il bottone fisso **Prenota un appuntamento**.
- Non vede Lavori, Calendario né Il mio spazio.
- Può cancellare l'account dall'app (requisito degli store).

### 3.3 Cliente
- **Home:** "Da fare per te" (lavori in attesa, contatore), prossimo appuntamento, I tuoi progetti (step del metodo), ultimi consigli, campanello notifiche.
- **Lavori:** contatori Da approvare / In modifica / Approvati, elenco filtrabile. Dettaglio con anteprima a più file, versione, storico versioni con commenti, nota del team, **Approvo** / **Chiedo modifiche** (con note posizionate sull'immagine e commento generale). All'approvazione compare l'effetto "glow" e il lavoro va in archivio.
- **Progetto:** i 4 step del metodo (Ascolto, Restituzione, Strategia, Consegna), cronologia, lavori collegati. La Restituzione è un lavoro che il cliente approva prima di proseguire.
- **Messaggi:** una sola conversazione con l'agenzia (risponde chi è disponibile), testo e allegati, nome e ruolo di chi risponde, messaggi collegati a un lavoro o appuntamento.
- **Calendario:** vista Mese / Elenco; tipi: consegna prevista, call, incontro, shooting, analisi strategica. Il cliente **vede ma non crea né sposta** (per spostare scrive un messaggio). "Aggiungi al mio calendario".
- **Il mio spazio:** Contratto (PDF), Servizi attivi, Fatture e pagamenti (sola consultazione e PDF, **nessun pagamento nell'app**), Questionario di gradimento, Archivio lavori, Materiali condivisi, Consigli, Impostazioni (notifiche, dati, password, privacy, esci).
- **Consigli:** schede brevi uguali per tutti (titolo, immagine, 3 punti, link).
- **Primo accesso cliente:** benvenuto con il metodo in 4 step → questionario → prenotazione dell'analisi strategica (almeno 1 ora: il cliente indica le disponibilità, il team conferma).

## 4. Backoffice (team)

### 4.1 Sezioni
Panoramica · Clienti · Lavori · Calendario · Messaggi · Consigli · Richieste visitatori · Questionari · Fatture, più Progetti, Contratti/servizi e Utenti del team (non presenti nella sidebar dei mockup: **(proposta)** dentro scheda cliente e impostazioni).

| Sezione | Cosa si fa |
|---|---|
| **Panoramica** | Contatori (lavori in attesa dei clienti, messaggi non letti, nuove richieste visitatori), elenchi rapidi, ricerca, "Carica un lavoro" |
| **Clienti** | Crea azienda e account, invia l'invito, scheda con dati e referente, disattiva a fine contratto |
| **Contratto, servizi, fatture** | PDF del contratto, pacchetto e servizi attivi, fatture caricate a mano (PDF + dati), stato pagamenti |
| **Progetti** | Un progetto per cliente e servizio, avanzamento dello step del metodo |
| **Lavori** | Carica per l'approvazione (cliente, progetto, titolo, file, nota), bozza o "Invia al cliente" con conferma, nuove versioni, legge commenti e note posizionate |
| **Calendario** | Crea, modifica, annulla appuntamenti per cliente; vista d'insieme |
| **Messaggi** | Casella unica di tutte le conversazioni, non letti in evidenza, risposta con allegati |
| **Consigli** | Scrive schede come bozza, pubblica o programma, modifica o ritira |
| **Questionari** | Legge i questionari (conoscitivi e di gradimento), conferma la data dell'analisi strategica |
| **Richieste visitatori** | Legge i questionari, imposta le fasce prenotabili, fissa/sposta le call; esito (cliente / non interessato); alla firma trasforma il visitatore in cliente |
| **Utenti del team** | Aggiunge o toglie persone e ne imposta il ruolo |

### 4.2 Permessi per ruolo
L = sola lettura · S = scrive/gestisce · — = nessun accesso. Dove non indicato dalla guida: **(proposta)**.

| Sezione | Amministratore | Operativo | Commerciale |
|---|---|---|---|
| Panoramica | S | S | L |
| Clienti (anagrafica, account, inviti) | S | L (proposta) | L |
| Contratto, servizi | S | — | L |
| Fatture e pagamenti | S (solo lui segna "Pagata" — da confermare) | — | L |
| Progetti e step del metodo | S | S | L |
| Lavori (carica, versioni, bozze) | S | S | L |
| Calendario | S | S | Solo fissare, spostare, annullare appuntamenti |
| Messaggi clienti | S | S | L |
| Consigli | S (pubblica) | scrive bozze (proposta) | L (proposta) |
| Questionari | S | L (proposta) | L |
| Richieste visitatori | S (esito e conversione) | — (proposta) | S (fascia oraria, fissa le call) |
| Utenti del team | S | — | — |

Regole operative:
- **Revisione:** ogni lavoro è rivisto da Elisa di persona *prima* del caricamento. L'app non ha un passaggio di approvazione interno: un lavoro inviato è subito visibile al cliente. Per evitare invii per errore: **bozza** (solo team) e conferma "Invia al cliente".
- **Registro delle azioni** (chi ha caricato, chi ha approvato, quando): l'approvazione del cliente ha valore di conferma.
- Ogni membro del team sceglie quali notifiche ricevere sul telefono.

## 5. Flussi principali

- **Approvazione lavoro:** lavoro pronto → Elisa lo rivede → Angelo lo carica → il cliente decide: *Approvo* (archivio) oppure *Chiedo modifiche* (nuova versione, si riparte dalla revisione).
- **Nuovo cliente:** contratto firmato → admin crea azienda e account, carica contratto, imposta servizi → il cliente riceve l'invito e imposta la password → questionario e disponibilità → il team conferma l'analisi strategica → primo progetto allo step Ascolto.
- **Nuovo contatto (visitatore):** scarica l'app → questionario e call → il commerciale riceve la notifica e conferma → esito segnato dall'admin → proposta → alla firma il visitatore diventa cliente.
- **Progetto:** il team aggiorna lo step; alla Restituzione carica il documento da approvare; approvato → Strategia → Consegna.
- **Messaggi:** il cliente scrive, tutto il team riceve l'avviso, risponde chi è disponibile (nome visibile).
- **Appuntamenti:** il team crea, il cliente riceve notifica e promemoria il giorno prima; per spostare il cliente scrive.
- **Consigli:** bozza → rivista e pubblicata (subito o programmata) → notifica ai clienti (disattivabile).

## 6. Notifiche

| Evento | Destinatario | Canale |
|---|---|---|
| Nuovo lavoro/versione da approvare | Cliente | Push + mail |
| Messaggio dall'agenzia | Cliente | Push |
| Appuntamento creato/spostato/annullato | Cliente | Push + mail |
| Promemoria (giorno prima) | Cliente | Push |
| Nuovo consiglio | Cliente | Push (disattivabile) |
| Nuova fattura / in scadenza (proposta) | Cliente | Push + mail |
| Lavoro approvato, modifiche richieste, messaggio dal cliente | Team | Push + avviso nel pannello |
| Questionario compilato | Team | Avviso nel pannello + mail |
| Nuova richiesta da visitatore | Commerciale, admin | Push + mail |
| Call confermata/spostata | Visitatore | Push + mail |

Solo ciò che richiede un'azione o cambia un appuntamento: niente notifiche promozionali.

## 7. Dati (schema di base)

Tutto ruota attorno all'**azienda cliente**. Entità: Azienda cliente, Account cliente, Utente team, Contratto, Servizio attivo, Progetto, Lavoro, Versione, Riscontro (note posizionate con coordinate relative), Appuntamento, Conversazione, Messaggio, Consiglio, Questionario, File condiviso, Fattura, Visitatore, Disponibilità.

Dai mockup emergono campi in più: data di inizio rapporto ("Cliente da…"), categoria / minuti di lettura / punti dei Consigli, ruolo visibile accanto al nome nei messaggi, partecipanti dell'appuntamento, modalità della call (telefono / in sede), notifiche in-app.

## 8. Sicurezza e privacy
- Permessi per riga lato server (un cliente = una azienda), link ai file protetti e a scadenza, connessioni e password cifrate.
- Backup automatici e ripristino; registro delle azioni.
- GDPR: server in UE, informativa dedicata accettata al primo accesso, esportazione/cancellazione dati, nomina del responsabile del trattamento.
- Visitatori: consenso privacy obbligatorio, marketing facoltativo.
- Accessibilità: contrasti WCAG AA, testo ridimensionabile. Solo italiano, ma testi separati dal codice.

## 9. Fasi
- **Fase 1:** accesso e inviti, area visitatori e prenotazione call, Home, Lavori con approvazione e versioni, Messaggi, Calendario, Il mio spazio, backoffice per tutto questo, notifiche principali.
- **Fase 2:** prenotazione analisi strategica nell'app, note posizionate sulle immagini, Consigli con editor, sblocco biometrico, modalità scura.
- **Fase 3:** report con numeri per cliente, collegamento consigli–sito, altre lingue.
- **Fuori ambito:** ore e commesse del team, più utenti per azienda, pagamento fatture in app.

> Nota: i mockup anticipano Face ID e note posizionate (fase 2 nella guida). Da decidere se entrano in fase 1.

## 10. Mockup (`docs/mockup/`)

| File | Schermata |
|---|---|
| V1 · V2 | Splash · "Sei già cliente?" |
| V3 · V4 · V5 | Questionario · prenotazione call · conferma |
| V6 · V7 | Visitatore dopo la prenotazione · senza questionario |
| C1 | Login cliente |
| C2 | Home |
| C3 · C4 · C5 · C6 | Lavori · da approvare · chiedo modifiche · approvato |
| C7 | Progetto (metodo in 4 step) |
| C8 | Calendario |
| C9 | Messaggi |
| C10 · C11 | Il mio spazio · fatture |
| C12 · C13 | Consiglio · stato vuoto |
| C14 | Questionario di gradimento |
| T1 · T2 | Backoffice: panoramica · carica un lavoro |
| icona_app | Icona dell'app |

**Non ancora disegnate:** contratto, servizi attivi, archivio lavori, materiali condivisi, impostazioni, consenso privacy, passi 1 e 3–5 del questionario, password da invito / recupero, centro notifiche, tutte le altre schermate del backoffice (Clienti, Calendario, Messaggi, Consigli, Fatture, Utenti, Richieste visitatori), backoffice da telefono.

## 11. Punti aperti
1. Incontro: solo telefono o in sede a Legnago (mockup) oppure anche online (guida)?
2. Chi segna una fattura come "Pagata"? Promemoria di scadenza: sì/no e quanti giorni prima?
3. Domande e frequenza del questionario di gradimento.
4. Collegamento con il calendario Outlook del commerciale.
5. Cosa fare del modulo attuale sul sito.
6. Il commerciale può rispondere ai messaggi dei visitatori? (la guida lo vuole in sola lettura, ma i visitatori scrivono "all'agenzia")
7. Font dei titoli: Monument Extended (guida) o Unbounded (presentazione/mockup).
8. Face ID e note posizionate in fase 1 o 2?
9. Dominio: i mockup mostrano `pannello.gl0w-up.com`; da confermare per backoffice e app.
10. Hosting, regione Supabase, servizio mail (da decidere insieme).
