# 2026-09-15 — Schema dell'Email Ingestion e scelta del provider inbound

Le fondamenta dati della feature progettata nel blocco precedente. Schema scritto
e validato; **migrazione non generata**, per la ragione spiegata in fondo.

## File modificati

### `prisma/schema.prisma`

- **`User`** — `inboundToken String? @unique` e `inboundTokenRotatedAt`. Il
  commento nello schema spiega perché è una colonna a sé e non `id`: è una
  credenziale al portatore, e un identificatore non si può ruotare mentre un
  indirizzo destinato a una regola di inoltro prima o poi trapela.
- **`PaymentLog`** — due aggiunte e un divieto scritto sopra il modello.
  `source` (`CRON | EMAIL | MANUAL`) e la relazione inversa `proposal`. Il
  commento dichiara l'invariante da difendere — *ogni riga è denaro che si è
  mosso* — e vieta esplicitamente di aggiungere qui uno stato di attesa, con la
  ragione: i lettori non filtrano questa tabella, e righe non confermate darebbero
  un totale gonfiato invece di un errore.
- **`InboundEmail`** — nuovo. Registro dell'idempotenza.
- **`PaymentProposal`** — nuovo. Proposta in attesa di approvazione.
- **`Subscription`** — relazione inversa `proposals`.
- Cinque enum: `InboundStatus`, `DedupeSource`, `ProposalStatus`,
  `ProposalResolution`, `PaymentSource`.

### `docs/Database_Tabelle_e_Modelli_Prisma.md`

Documentate le due entità, il token e `source`. Corretto anche un residuo che
dichiarava mancante `canceledAt` — il soft-delete è in produzione da oggi
pomeriggio. Riscritti i "Lavori aperti", che elencavano come da fare due cose già
fatte.

### `docs/Email_Ingestion_e_Matching.md`

Aggiunta la sezione sul provider inbound e la correzione al Nodo 1 (vedi sotto).

## "L'evidenza vince sulla previsione", tradotto in schema

Non è rimasto un principio nella documentazione: è `ProposalResolution`.

Il cron scrive `PaymentLog` su previsione, la ricevuta arriva come evidenza. Se
entrambi coprono lo stesso ciclo il mese verrebbe contato due volte nel flusso di
cassa. Approvare quindi non crea sempre una riga nuova, e `resolution` registra
quale strada è stata presa: `CREATED` se nessun pagamento esisteva per quel ciclo,
`RECONCILED` se ne esisteva già uno ed è stato corretto. In entrambi i casi
`paymentLogId` collega la proposta alla riga risultante.

La relazione inversa su `PaymentLog` dice il resto: un pagamento con una proposta
collegata è corroborato da un documento reale, non solo previsto dal calendario.

## Scoperta progettando il webhook: l'identità sta nella busta

Il disegno del Nodo 1 diceva di leggere il token dall'indirizzo di destinazione.
**Non funziona**, e fallisce proprio nel caso d'uso principale: l'inoltro
automatico conserva il destinatario originale, quindi l'intestazione `To` contiene
la casella personale dell'utente e non il nostro indirizzo dedicato.

Il token va letto dal **destinatario di busta** (`RCPT TO` del dialogo SMTP), che i
provider espongono in un campo separato. È lo stesso errore del matching sul
mittente, in un'altra intestazione: le intestazioni raccontano il messaggio
originale, la busta racconta questa consegna.

Conseguenza sulla scelta del provider: esporre il destinatario di busta diventa un
requisito eliminatorio, non una comodità. Correzione aggiunta alla macro-area.

## Provider inbound: raccomandato Postmark

Tre requisiti, tutti derivati dai nodi risolti: `Message-ID` grezzo raggiungibile,
destinatario di busta esposto, payload JSON.

Postmark li soddisfa tutti e tre in modo diretto — `Headers` completo,
`OriginalRecipient`, e soprattutto `MailboxHash`, che è pensato esattamente per gli
indirizzi per-oggetto. Da qui una rifinitura del disegno: conviene passare da
`<token>@in.subsync.app` a `receipts+<token>@in.subsync.app`, per allinearsi a una
funzione di prima classe del provider invece di estrarre il token a mano.

Mailgun è la seconda scelta solida; SendGrid funziona ma consegna
`multipart/form-data`, cioè impalcatura in più su contenuto non fidato; Cloudflare
Email Workers dà controllo totale al prezzo di gestire MIME grezzo.

⚠️ **Su Resend non mi sono espresso**: è eccellente in uscita, ma la maturità del
suo inbound non mi risulta accertata e non ho modo di verificarla da qui. Nella
tabella è segnato come "da verificare" invece di essere raccomandato o scartato:
un giudizio inventato sarebbe peggio di nessun giudizio.

Vincolo operativo segnalato: **Vercel rifiuta i corpi oltre ~4,5 MB**, e una
fattura con PDF allegato può avvicinarsi al limite. Gli allegati vanno esclusi in
configurazione, o il messaggio scartato prima di tentarne l'elaborazione.

## Verifica

- `npx prisma validate` — **exit 0**, schema valido
- `npx prisma generate` — **exit 0**, client rigenerato
- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx vitest run` — **exit 0**, 73 test su 5 file
- `npx next build` — **exit 0**

`validate` e `generate` sono stati eseguiti iniettando **stringhe di connessione
fittizie** nell'ambiente della singola invocazione. Nessuno dei due comando apre
una connessione: servono solo a far risolvere `env()`. Le credenziali reali non
sono state lette né scritte, coerentemente con la Parte VI di `AI_law_subsync.md`.

## ⚠️ Migrazione non generata

Deliberato. `prisma migrate dev` richiede `DIRECT_URL` e un database shadow: in
locale non è disponibile per scelta di progetto — `.env` è un guardrail contro le
esecuzioni accidentali su database reale, non una dimenticanza.

Lo schema è **pronto per il deploy**: la migrazione va generata contro Supabase
come passo di rilascio consapevole, con le credenziali iniettate da `.env.local`.
`vercel.json` esclude `migrate deploy` dal build proprio perché questo passo resti
una decisione umana.

Nota sulla retro-compatibilità: tutte le aggiunte sono additive. `inboundToken` è
nullable, `source` ha default `CRON` — che è anche il valore corretto per le righe
esistenti, visto che finora il cron è l'unica sorgente di `PaymentLog`. Nessun
dato esistente va toccato.

## Osservazione emersa

⚠️ Il task chiedeva di includere il **payload grezzo** del messaggio "se utile per
il debug". Non l'ho fatto, e il perché sta nella nota già committata: del messaggio
si conserva il minimo indispensabile, il corpo non viene archiviato. Al suo posto
ci sono due campi `Json` più stretti — `authResults` (esiti SPF/DKIM/ARC, che
servono anche come segnale di fiducia) e `parsedData` (il risultato strutturato
dell'estrazione). Coprono la diagnostica senza trattenere posta di persone reali.
Se il team vuole il corpo per il collaudo iniziale, va aggiunto come colonna a
scadenza e non come default permanente.

## Stato

Schema valido, client rigenerato, suite verde. Migrazione in attesa del rilascio.
