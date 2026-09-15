# 2026-09-15 — Email Ingestion: chiusura dei tre nodi di modello

Progettazione pura. **Nessun codice applicativo scritto**, nessuna migrazione: lo
schema Prisma nella nota è progettato e dichiarato tale.

## Ambito ristretto, prima dei nodi

Il team ha chiarito che la feature elabora **solo email transazionali** — ricevute
e fatture di rinnovo emesse dai provider. Non è una delimitazione difensiva, è ciò
che rende il problema risolvibile, ed è stato messo in cima alla nota perché tre
scelte a valle dipendono da lì: le transazionali sono generate da template (parsing
su testo strutturato, non su prosa), hanno un mittente stabile e verificabile (che
diventa il segnale di matching più pulito) e contengono un solo fatto economico
(niente da disambiguare).

## Nodo 1 — Identità

**Indirizzo di ricezione univoco per utente**, token casuale da 128 bit in base32,
non derivato dallo `userId`.

Il matching sul mittente è stato scartato per tre ragioni indipendenti, ognuna
sufficiente da sola. La più decisiva non è la sicurezza ma il fatto che **si rompe
sul caso d'uso principale**: l'inoltro automatico conserva il mittente originale,
quindi la ricevuta arriva con `From: Netflix` e non con l'indirizzo dell'utente.
Funzionerebbe solo con l'inoltro manuale, uno per uno — esattamente la fatica che
la feature dovrebbe eliminare. In più `From` si falsifica in una riga di SMTP, il
che permetterebbe di iniettare pagamenti inventati nell'account altrui.

Conseguenza trattata esplicitamente: **il token è una credenziale al portatore**.
Da qui rotazione (è la ragione per cui è una colonna a sé e non lo `userId`: un
identificatore non si può ruotare), rate limit per token, allowlist di domini
opzionale.

Distinzione che ritengo la parte migliore di questo nodo: **identità e fiducia sono
due assi diversi.** Il token dice di chi è il messaggio, SPF/DKIM/ARC dicono quanto
crederci — e vanno usati come segnale di punteggio, mai come filtro rigido, perché
l'inoltro automatico rompe SPF quasi sempre e un controllo bloccante scarterebbe la
maggioranza delle email legittime.

## Nodo 2 — Idempotenza

`Message-ID` normalizzato come `dedupeKey`, con hash SHA-256 del contenuto come
ripiego quando manca o è malformato (la RFC lo raccomanda ma non lo impone). Quale
dei due sia stato usato viene registrato: hanno garanzie diverse.

Due scelte non ovvie:

**Lo scope è `(userId, dedupeKey)`, non globale.** Un vincolo globale sembra più
rigoroso ed è un bug: la stessa ricevuta familiare inoltrata da due conviventi con
account distinti è due fatti legittimi, non un duplicato.

**Il vincolo sta sul database, non in un controllo applicativo.** `SELECT` poi
`INSERT` sono due operazioni: due consegne concorrenti passano entrambe il
controllo e scrivono entrambe. È la stessa fragilità già osservata sul cron dei
rinnovi, che nessun lock protegge. Qui si inserisce per primo e si intercetta la
violazione del vincolo — **rispondendo 200, non un errore**, perché per il provider
inbound un codice diverso da 2xx innesca altri ritentativi in una spirale.

Aggiunta emersa scrivendo: rivendicare prima ed elaborare dopo espone al rischio
opposto, cioè perdere un messaggio se l'elaborazione crolla a metà. Risolto con una
macchina a stati in cui **solo `FAILED` è rielaborabile**, con contatore di
tentativi.

## Nodo 3 — Stato di attesa

**Entità `PaymentProposal` separata. `PaymentLog` non cambia forma.**

È la decisione su cui ho ragionato di più, perché l'alternativa — `status: PENDING
| CONFIRMED` su `PaymentLog` — è la strada naturale ed è l'errore che il progetto
ha già commesso una volta. Il soft-delete ha insegnato che *dimenticare un filtro
non produce un errore ma un numero sbagliato*, ed è per questo che il filtro degli
attivi vive in un punto solo. Uno `status` su `PaymentLog` ricrea quel pericolo su
una seconda entità: `getPaymentsByUser`, `getPaymentsByUserInRange`, lo storico di
cassa e la timeline comincerebbero tutti a sommare righe non confermate finché
qualcuno non li aggiorna uno per uno, con un totale gonfiato e nessun errore.

Con l'entità separata `PaymentLog` conserva il suo invariante — ogni riga è denaro
che si è mosso — nessun lettore esistente cambia, e il sistema di tipi impedisce a
una proposta di finire dentro `computeHistoricalCashFlow`.

Distinzione annotata nella nota perché è la regola generale sotto il caso
particolare: aggiungere una colonna `source` (`CRON | EMAIL | MANUAL`) sarebbe
invece innocuo. Nessuno deve filtrare per `source` per ottenere una somma corretta.
**Un'etichetta si può aggiungere, un filtro no.**

## Problema emerso, non richiesto: collisione cron ↔ ingestione

Incrociando le due fonti: il cron scrive `PaymentLog` **su previsione** (la data è
arrivata, quindi il pagamento è avvenuto), l'email scrive **su evidenza** (la
ricevuta esiste). Se entrambi coprono lo stesso ciclo, il mese viene contato due
volte nel flusso di cassa.

Regola proposta: **l'evidenza vince sulla previsione.** Prima di materializzare
un'approvazione si cerca un `PaymentLog` esistente nella finestra del ciclo che
contiene la data proposta; se c'è, l'approvazione **corregge** quella riga invece di
crearne una nuova, e la proposta si chiude come riconciliazione. La finestra si
calcola dal ciclo di fatturazione, non da una tolleranza fissa in giorni: mensile e
annuale hanno margini di ambiguità molto diversi.

Nessuna delle due fonti vede questo problema da sola. È la ragione per cui valeva
la pena progettare prima di scrivere.

## Conseguenza sul flusso già documentato

Il disegno precedente prevedeva due rami — automatico sopra soglia, da confermare
sotto. **Ora tutto passa dall'approvazione**, e il punteggio non decide più *se*
scrivere ma come ordinare e presentare le proposte. Riscritto di conseguenza il
diagramma del flusso e le voci di `TODO.md`.

Contro-rischio segnalato nella nota: l'approvazione obbligatoria può trasformare la
funzione che toglieva fatica in venti conferme al mese. Due mitigazioni proposte —
approvazione in blocco e fiducia per abbonamento — entrambe **sopra** il
comportamento conservativo, mai al posto suo.

## File modificati

- **`docs/Email_Ingestion_e_Matching.md`** — riscritta. Stato da "progettato, non
  implementato" a "modello chiuso, implementazione da fare". Nuove sezioni: ambito,
  i tre nodi, collisione cron/ingestione, modello dati proposto, privacy.
- **`TODO.md`** — nodi di modello spuntati con le scelte in sintesi; voci residue
  riscritte sul nuovo flusso (proposta sempre `PENDING`, schermata di approvazione,
  transazione unica, mitigazioni).

## Verifica

Modifica esclusivamente documentale: nessun file di codice toccato, nessuna
migrazione scritta. Suite eseguita comunque per accertare che il repository resti
verde.

- `npx vitest run` — **exit 0**, 73 test su 5 file
- `npx tsc --noEmit` — **exit 0**

## Osservazione emersa

⚠️ **`docs/Database_Tabelle_e_Modelli_Prisma.md` non è stato aggiornato.** Il task
chiedeva esplicitamente di lavorare solo sulla nota dell'ingestione, e l'ho
rispettato; ma le due nuove entità e il token su `User` appartengono anche a quella
macro-area, e vanno riportate lì quando la migrazione verrà scritta. Registrato in
`TODO.md` come voce della migrazione.

## Stato

Secondo di due commit della sessione (fix cache/sidebar, progettazione ingestion).
