# Email Ingestion e Matching

**Stato: modello chiuso, implementazione da fare.** Terzo obiettivo dello Sprint 8,
dopo il [[Soft_Delete_Abbonamenti]] e le proiezioni di cassa.

Secondo canale di alimentazione dei dati, accanto al cron dei rinnovi e allo
scanner manuale: le ricevute arrivano da sole via email e aggiornano gli
abbonamenti senza intervento dell'utente.

Nodo padre: [[Index]]

---

## Perché è la killer feature

Oggi l'utente inserisce i dati a mano, o al più fotografa una ricevuta con
[[Lettura_Scontrini_OCR_Gemini]]. In entrambi i casi **l'aggiornamento dipende da
lui**, e i dati invecchiano: un aumento di prezzo o uno slittamento del rinnovo
restano invisibili finché qualcuno non se ne accorge.

Le ricevute però arrivano già, per email, a ogni rinnovo. Intercettarle chiude il
ciclo: il Burn Rate smette di essere una fotografia del giorno dell'inserimento e
diventa un dato vivo.

---

## Ambito: solo email transazionali

La feature elabora **esclusivamente ricevute e fatture di rinnovo** emesse dai
provider — Netflix, AWS, Spotify, Adobe. Non è un client di posta, non legge
conversazioni, non interpreta newsletter, non risponde a nessuno.

Delimitare l'ambito non è una rinuncia, è ciò che rende il problema risolvibile.
Le email transazionali hanno tre proprietà che una email qualsiasi non ha:

- **Sono generate da un template.** Lo stesso fornitore manda lo stesso layout ogni
  mese: il parsing lavora su testo strutturato, non su prosa.
- **Hanno un mittente stabile e verificabile.** Il dominio di provenienza è un
  segnale forte, riusabile sia per il matching sia per la fiducia nel contenuto.
- **Contengono un solo fatto economico.** Un importo, una data, un servizio. Niente
  da disambiguare fra più transazioni nello stesso messaggio.

Tutto ciò che non ricade in questa definizione viene scartato in ricezione, non
interpretato male più avanti.

---

## Flusso logico

```
indirizzo di ricezione dedicato per utente
        │  webhook HTTP dal provider inbound
        ▼
1. Ricezione        autentica la chiamata, identifica l'utente dal token,
                    rivendica il messaggio (idempotenza)
        ▼
2. Parsing          estrae nome servizio, importo, data, valuta
        ▼
3. Matching         punteggio con soglia sugli abbonamenti ATTIVI dell'utente
        ▼
4. Proposta         SEMPRE in stato PENDING — nessuna scrittura su PaymentLog
        ▼
5. Approvazione     l'utente conferma in UI → il pagamento diventa effettivo
```

La differenza rispetto al disegno precedente sta al punto 4: non esistono più due
rami, uno automatico sopra soglia e uno da confermare sotto soglia. **Tutto passa
dall'approvazione.** Il punteggio non decide più *se* scrivere, ma come ordinare e
presentare le proposte.

---

## Nodo 1 — Identità: chi ha ricevuto questa ricevuta

### La scelta

**Indirizzo di ricezione univoco per utente**, del tipo

```
k7m2q9x4vp8n3wz6rt5hjd@in.subsync.app
```

Il token è un valore casuale da 128 bit codificato in base32 minuscola, **non
derivato dallo `userId`**: non deve essere indovinabile, enumerabile, né
correlabile all'account guardandolo.

### Perché non il mittente

L'alternativa — riconoscere l'utente dall'indirizzo mittente — è più semplice e
sbagliata per tre ragioni indipendenti, ognuna sufficiente da sola.

**Si rompe proprio sul caso d'uso principale.** L'inoltro automatico è il modo in
cui la feature viene usata davvero: l'utente crea un filtro nel suo client di posta
e dimentica. Ma un inoltro automatico **conserva il mittente originale**: la
ricevuta di Netflix arriva con `From: Netflix`, non con l'indirizzo dell'utente.
Riconoscere l'utente dal mittente funziona solo con l'inoltro manuale, uno per uno,
che è esattamente la fatica che la feature dovrebbe eliminare.

**È falsificabile.** L'intestazione `From` si scrive a mano. Chiunque conosca
l'email di un utente potrebbe iniettare ricevute inventate nel suo account: un
pagamento da 500 € che entra nello storico di cassa e sporca il Burn Rate. Non è un
attacco teorico, è una riga di SMTP.

**Un utente ha più indirizzi.** Personale, di lavoro, alias. Servirebbe comunque un
registro di indirizzi verificati per utente — cioè la stessa complessità della
soluzione migliore, con in più tutti i suoi difetti.

### Il token è una credenziale, e va trattata come tale

Chi conosce l'indirizzo può depositare ricevute in quell'account. Conseguenze
operative, non opzionali:

- **Rotazione.** L'indirizzo finirà scritto in una regola di inoltro, in un
  copia-incolla, forse in un thread condiviso. L'utente deve poterlo rigenerare; il
  vecchio smette di funzionare all'istante. È la ragione per cui il token è una
  colonna a sé e non lo `userId`: un identificatore non si può ruotare.
- **Rate limit per token**, per impedire che un indirizzo trapelato diventi un
  canale di inondazione.
- **Allowlist di domini mittenti**, opzionale e disattivata di default: l'utente
  può restringere l'accettazione a `netflix.com`, `amazon.com` e simili. Difesa in
  profondità per chi la vuole, non un ostacolo per chi inizia.

### Identità e fiducia sono due assi diversi

Il token dice **di chi è** il messaggio. Non dice **quanto crederci**.

Per quello servono i risultati di autenticazione che il provider inbound riporta —
SPF, DKIM, ARC — e il dominio mittente verificato. Ma vanno usati come **segnale di
punteggio, mai come filtro rigido**: l'inoltro automatico rompe SPF quasi sempre, e
un controllo bloccante scarterebbe la maggioranza delle email legittime. Una firma
DKIM valida del dominio del fornitore alza la confidenza; la sua assenza la abbassa
senza escludere nulla.

---

## Nodo 2 — Idempotenza: lo stesso messaggio, una volta sola

### La chiave

Ogni messaggio accettato viene **rivendicato** in una riga `InboundEmail` prima di
essere elaborato, con un `dedupeKey` e un vincolo di unicità su
`(userId, dedupeKey)`.

Il `dedupeKey` è, in ordine:

1. Il **`Message-ID`** dell'intestazione RFC 5322, normalizzato: parentesi angolari
   rimosse, spazi tagliati. È l'identificatore che il server di posta d'origine
   assegna al messaggio e che sopravvive intatto ai tentativi di riconsegna.
2. Se manca o è malformato — la RFC lo raccomanda ma non lo impone, e i mittenti
   scorretti esistono — un **hash SHA-256** di `from + subject + date + corpo
   normalizzato`.

Quale dei due sia stato usato viene registrato in `dedupeSource`: un
`Message-ID` e un hash hanno garanzie diverse, e sapere quale si sta guardando
serve quando qualcosa va storto.

### Perché lo scope è per utente e non globale

Un vincolo globale sembrerebbe più rigoroso ed è invece un bug: la stessa ricevuta
familiare inoltrata da due conviventi con due account distinti è **due fatti
legittimi**, non un duplicato. Vincolando su `(userId, dedupeKey)` il secondo utente
non viene silenziosamente ignorato.

### Perché il vincolo sta sul database e non in un controllo applicativo

Un `SELECT` che cerca il messaggio e un `INSERT` che lo scrive sono due operazioni
distinte: due consegne concorrenti dello stesso messaggio — il ritentativo del
provider che si sovrappone alla prima consegna — passano entrambe il controllo e
scrivono entrambe. È la stessa fragilità già osservata sul cron dei rinnovi in
[[Gestione_Pagamenti_e_Rinnovi]], dove nessun lock protegge l'esecuzione.

Qui si risolve alla radice: si tenta l'inserimento per primo e ci si affida al
vincolo di unicità. La seconda scrittura fallisce atomicamente, il codice intercetta
la violazione e **risponde 200**, non un errore. Per il provider inbound il
messaggio è stato gestito, e un codice diverso da 2xx innescherebbe altri
ritentativi in una spirale senza fine.

### Rivendicare prima, elaborare dopo

La riga nasce in stato `RECEIVED` e attraversa una macchina a stati:

```
RECEIVED ──► PARSED ──► PROPOSED      (proposta creata, in attesa dell'utente)
    │            │
    └────────────┴──► DISCARDED       (non è una ricevuta: fuori ambito)
    │
    └──► FAILED                        (errore di elaborazione, ritentabile)
```

Rivendicare prima di elaborare significa che un crash a metà strada lascia il
messaggio marcato e un ritentativo lo troverebbe già presente. Per non perderlo per
sempre, **solo lo stato `FAILED` è rielaborabile**, con un contatore di tentativi
che ne limita il numero. Uno stato terminale non si riapre mai.

---

## Nodo 3 — Stato di attesa: niente entra nei conti senza approvazione

### Il rischio da cui nasce

Lo storico del flusso di cassa si legge dai `PaymentLog` reali — è la decisione
presa progettando le proiezioni, documentata in [[Gestione_Pagamenti_e_Rinnovi]].
Ne segue che **una riga sbagliata in `PaymentLog` è una bugia permanente nel
grafico storico**: un importo letto male dall'estrattore — `1.200,00` dove c'era
`12,00` — non produce un errore, produce un picco che l'utente vede e non sa
spiegare.

Un aggiornamento di prezzo è anche peggio: si propaga al Burn Rate e a tutta la
proiezione futura.

### La scelta: entità separata, non uno stato su `PaymentLog`

Le proposte vivono in una tabella propria, `PaymentProposal`. `PaymentLog`
**non cambia forma**.

L'alternativa — aggiungere `status: PENDING | CONFIRMED` a `PaymentLog` — è la
tentazione naturale ed è l'errore che questo progetto ha già commesso una volta e
imparato a riconoscere. Con il soft-delete si è visto che *dimenticare un filtro
non produce un errore ma un numero sbagliato*, e per questo il filtro degli attivi
è stato concentrato in un unico punto.

Mettere uno `status` su `PaymentLog` ricrea esattamente quel pericolo su una
seconda entità: `getPaymentsByUser`, `getPaymentsByUserInRange`, lo storico di
cassa e la timeline dei pagamenti inizierebbero tutti a sommare righe non
confermate finché qualcuno non li aggiorna uno per uno, e il sintomo sarebbe un
totale gonfiato senza nessun messaggio d'errore.

Con l'entità separata, invece:

- **`PaymentLog` conserva il suo invariante**: ogni riga è denaro che si è mosso.
  Non c'è niente da filtrare perché non c'è niente di non-denaro dentro.
- **Nessun lettore esistente cambia.** Zero righe da modificare, zero occasioni di
  dimenticarne una.
- **Il sistema di tipi aiuta.** Una `PaymentProposal` non è un `PaymentLog`: non può
  finire per sbaglio dentro `computeHistoricalCashFlow`, perché non compila.

> Distinzione utile: aggiungere a `PaymentLog` una colonna `source`
> (`CRON | EMAIL | MANUAL`) è invece **innocuo e utile**. Nessuno ha bisogno di
> filtrare per `source` per ottenere una somma corretta, quindi dimenticarsene non
> produce numeri sbagliati. È la differenza fra un'etichetta e un filtro: la prima
> si può aggiungere, il secondo va evitato.

### Cosa contiene una proposta

Non solo il pagamento: **tutto ciò che l'approvazione andrà a scrivere**, così
l'utente vede in anticipo l'intera conseguenza del suo sì.

- il pagamento proposto (importo, valuta, data);
- l'abbonamento a cui è stato associato, oppure `null` se nessuno corrisponde;
- l'eventuale **variazione di prezzo**, presentata in chiaro: «Netflix: 12,99 →
  15,99 €»;
- il punteggio di corrispondenza e **quali segnali l'hanno prodotto**, perché una
  proposta che non sa spiegarsi non è verificabile.

Approvare applica tutto in **una sola transazione**: creazione del `PaymentLog`,
aggiornamento del prezzo se previsto, allineamento di `nextRenewalDate`,
`revalidatePath` sulle viste dipendenti (Regola 3). Rifiutare non scrive nulla.

Se non c'è corrispondenza, la stessa entità copre il caso: l'approvazione crea
l'abbonamento **e** il suo primo pagamento.

### E se approvare diventa un lavoro?

Il rischio dell'approvazione obbligatoria è trasformare la funzione che doveva
togliere fatica in venti conferme al mese. Due mitigazioni, entrambe da costruire
sopra il comportamento conservativo, mai al posto suo:

- **approvazione in blocco** delle proposte ad alta confidenza, in un gesto solo;
- **fiducia per abbonamento**, disattivata di default: dopo che l'utente ha visto
  funzionare il riconoscimento per un fornitore, può concedergli l'approvazione
  automatica limitatamente alle corrispondenze esatte. Si concede, non si eredita.

Una proposta mai risolta non resta appesa per sempre: scade dopo un periodo
definito e passa a `EXPIRED`.

---

## Collisione fra cron e ingestione

Problema che emerge dall'incrocio delle due fonti, e che va risolto qui perché
nessuna delle due lo vede da sola.

Il cron scrive `PaymentLog` **su previsione**: la data di rinnovo è arrivata,
quindi il pagamento è avvenuto. L'email scrive **su evidenza**: la ricevuta esiste.
Se entrambi coprono lo stesso ciclo, il mese viene contato due volte nel flusso di
cassa.

**L'evidenza vince sulla previsione.** Prima di materializzare un'approvazione si
cerca un `PaymentLog` già esistente per quell'abbonamento nella finestra del ciclo
che contiene la data proposta. Se c'è, l'approvazione non crea una riga nuova:
**corregge quella esistente**, allineandone importo e data al documento reale, e la
proposta si chiude come riconciliazione anziché come inserimento.

La finestra si calcola dal ciclo di fatturazione, non da una tolleranza fissa in
giorni: un mensile e un annuale hanno margini di ambiguità molto diversi.

---

## Modello dati proposto

⚠️ **Progettato, non applicato.** Nessuna migrazione è stata scritta. Al momento
dell'implementazione va aggiornato anche [[Database_Tabelle_e_Modelli_Prisma]].

```prisma
// Indirizzo di ricezione dedicato — su User
// inboundToken          String?   @unique   // 128 bit, base32, ruotabile
// inboundTokenRotatedAt DateTime?

enum InboundStatus { RECEIVED PARSED PROPOSED DISCARDED FAILED }
enum DedupeSource  { MESSAGE_ID CONTENT_HASH }
enum ProposalStatus { PENDING APPROVED REJECTED EXPIRED }

model InboundEmail {
  id           String        @id @default(cuid())
  userId       String
  dedupeKey    String        // Message-ID normalizzato, o hash del contenuto
  dedupeSource DedupeSource
  fromAddress  String
  subject      String
  receivedAt   DateTime
  status       InboundStatus @default(RECEIVED)
  attempts     Int           @default(0)
  error        String?
  proposal     PaymentProposal?

  @@unique([userId, dedupeKey])   // ← l'idempotenza vive QUI, non nel codice
  @@index([userId, status])
}

model PaymentProposal {
  id             String         @id @default(cuid())
  userId         String
  inboundEmailId String         @unique
  subscriptionId String?        // null = nessuna corrispondenza
  serviceName    String         // nome estratto, per il caso senza corrispondenza
  amount         Decimal        @db.Decimal(12, 2)   // Regola 1
  currency       String
  paidAt         DateTime       // Regola 2: 00:00:00 UTC
  priceChange    Decimal?       @db.Decimal(12, 2)   // nuovo prezzo, se diverso
  matchScore     Decimal        @db.Decimal(5, 2)
  matchSignals   String[]       // quali segnali hanno contribuito
  status         ProposalStatus @default(PENDING)
  resolvedAt     DateTime?
  paymentLogId   String?        // popolato all'approvazione

  @@index([userId, status])
}
```

`PaymentLog` resta invariato, salvo l'eventuale colonna `source` discussa sopra.

---

## Matching

Il passaggio che decide la qualità dell'intera feature. Dato un pagamento estratto,
trovare l'abbonamento dell'utente a cui appartiene.

| Segnale | Forza | Nota |
| ------- | ----- | ---- |
| Dominio del mittente | alta | `netflix.com` → Netflix. Il segnale più pulito, disponibile solo grazie al focus sulle transazionali |
| Nome del servizio | media | "Netflix" contro "NETFLIX.COM" contro "Netflix International B.V." — serve normalizzazione, non uguaglianza |
| Importo | alta se combinato | Da solo confonde due servizi allo stesso prezzo |
| Prossimità al `nextRenewalDate` | alta | Una ricevuta a ridosso del rinnovo atteso è quasi certamente quella |
| Esito DKIM/ARC | modificatore | Alza o abbassa la confidenza, non esclude mai |
| Valuta | filtro | Esclude, non conferma |

Punteggio con soglia, non uguaglianza. Con il [[Soft_Delete_Abbonamenti]] il
matching cerca **solo fra gli attivi**: una ricevuta non può appartenere a un
abbonamento già cessato.

Il punteggio non autorizza più una scrittura automatica (vedi Nodo 3): serve a
ordinare le proposte e a decidere quali sono candidate all'approvazione in blocco.

---

## Sicurezza e privacy

L'endpoint riceve contenuto non fidato da internet. Segreto condiviso con il
provider inbound, dimensione massima del payload, nessuna esecuzione di contenuto
dell'email, e un'estrazione che non si fida mai del risultato del parser prima di
scriverlo. Vale la stessa disciplina dello scanner: gli errori tornano come valore,
non come eccezione.

**Del messaggio si conserva il minimo indispensabile**: mittente, oggetto, data e
i campi estratti. Il corpo non viene archiviato. È posta di persone reali, e la
cosa più sicura da fare con un dato sensibile è non averlo — oltre a essere ciò che
le pagine legali già pubblicate dichiarano.

---

## Provider inbound

Raccomandazione tecnica, **da approvare**. Tre requisiti la governano, tutti
derivati dai nodi risolti sopra:

1. **`Message-ID` grezzo raggiungibile** — senza, l'idempotenza ricade sull'hash
   del contenuto per ogni messaggio, con garanzie più deboli.
2. **Destinatario di busta esposto** — vedi sotto: è l'unico modo affidabile di
   sapere su quale indirizzo dedicato è arrivato il messaggio.
3. **Payload JSON** — un route handler su Vercel che deve smontare a mano un
   `multipart/form-data` è lavoro in più su contenuto non fidato.

### ⚠️ Correzione al Nodo 1: l'identità sta nella busta, non nell'intestazione

Progettando il webhook emerge un dettaglio che il disegno dell'identità non
copriva. **L'intestazione `To` non contiene affatto il nostro indirizzo dedicato
quando il messaggio arriva per inoltro automatico**: conserva il destinatario
originale, cioè la casella personale dell'utente. Leggere il token da `To`
fallirebbe proprio nel caso d'uso principale, esattamente come il matching sul
mittente.

Il token va letto dal **destinatario di busta** (`RCPT TO` del dialogo SMTP), che i
provider espongono in un campo dedicato. Conseguenza sulla scelta: un provider che
non lo espone è inutilizzabile, non scomodo.

### Confronto

| Provider | `Message-ID` | Destinatario di busta | Formato | Giudizio |
| -------- | ------------ | --------------------- | ------- | -------- |
| **Postmark** | nell'array `Headers` completo | `OriginalRecipient`, più `MailboxHash` per il token | **JSON** | Il più diretto |
| Mailgun | campo dedicato in modalità parsed | `recipient` | form-encoded | Solido, firma HMAC da verificare |
| SendGrid | solo dentro `headers` grezzi, da parsare a mano | `envelope` (JSON dentro un campo) | `multipart/form-data` | Funziona, più impalcatura |
| Cloudflare Email Workers | MIME grezzo, tutto disponibile | disponibile | nessuno, MIME puro | Controllo massimo, lavoro massimo |
| Resend | **da verificare** | da verificare | JSON | Ottimo in uscita; la maturità dell'inbound va accertata prima di sceglierlo, non data per buona |

### Raccomandazione: Postmark

- **JSON nativo.** Il route handler riceve un oggetto, non un `multipart` da
  smontare: meno codice su contenuto proveniente da internet.
- **`MailboxHash` è fatto per questo.** Con indirizzi nella forma
  `receipts+<token>@in.subsync.app`, il provider estrae il token e lo consegna in
  un campo suo. È il motivo per cui conviene passare dalla forma
  `<token>@in.subsync.app` a quella con separatore: si allinea a una funzione di
  prima classe invece di ricavare il token a mano.
- **`Headers` completo**, quindi `Message-ID` e risultati di autenticazione sono
  entrambi raggiungibili dallo stesso payload.

### Vincoli operativi da tenere presenti

- **Vercel rifiuta i corpi oltre ~4,5 MB.** Una fattura con PDF allegato può
  avvicinarsi al limite: gli allegati vanno esclusi in configurazione, o il
  messaggio scartato con `DISCARDED` prima di tentarne l'elaborazione.
- **Dominio di ricezione separato** (`in.subsync.app`) con record MX propri, per
  non toccare la posta del dominio principale.
- Il webhook resta comunque autenticato con segreto condiviso: il provider è un
  mittente fidato, non una dispensa dall'autenticazione.

---

## Cosa resta aperto

I tre nodi di modello sono chiusi e lo schema è scritto. Restano:

- **approvazione della scelta del provider** e verifica sul campo dei tre
  requisiti;
- **configurazione DNS** del dominio di ricezione (MX, SPF, DMARC);
- **migrazione** dei nuovi modelli, da generare contro il database reale;
- **taratura della soglia** di punteggio, che si può fare solo su ricevute vere;
- forma della **schermata di approvazione**, da progettare con
  [[Interfaccia_Grafica_Dashboard]].

---

## Collegato a
[[Gestione_Pagamenti_e_Rinnovi]] · [[Lettura_Scontrini_OCR_Gemini]] · [[Database_Tabelle_e_Modelli_Prisma]] · [[Soft_Delete_Abbonamenti]] · [[Auth_Utenti_e_Sessioni_Supabase]] · [[Motore_Regole_NextJS]] · [[Interfaccia_Grafica_Dashboard]]
