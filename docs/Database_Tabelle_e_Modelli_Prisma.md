# Database, Tabelle e Modelli (Prisma)

Schema relazionale, layer di accesso ai dati e regole di correttezza su denaro e date.
È la base su cui poggiano tutti i domini applicativi.

Nodo padre: [[Index]]

---

## Schema relazionale

```
User (1) ──< (N) Subscription (1) ──< (N) PaymentLog
                      │                       ▲
                      └──< (N) SubscriptionMember      │ (0..1)
User (1) ──< (N) ExpenseCategory ──> (N) Subscription  │
                                                       │
User (1) ──< (N) InboundEmail (1) ──── (0..1) PaymentProposal
```

### `User`
Identità applicativa. L'`id` è allineato a quello Supabase e popolato dal trigger
descritto in [[Auth_Utenti_e_Sessioni_Supabase]]. Da qui pendono abbonamenti, membership di
condivisione e categorie di spesa.

Porta inoltre `inboundToken`, la parte locale dell'indirizzo di ricezione dedicato
(`<token>@in.subsync.app`) su cui arrivano le ricevute — vedi
[[Email_Ingestion_e_Matching]].

⚠️ Il token **non** coincide con `id` e non ne deriva, e la ragione è nello
schema, non nel codice: è una credenziale al portatore, chi lo conosce può
depositare ricevute in questo account. Un identificatore non si può ruotare;
un indirizzo destinato a finire in una regola di inoltro prima o poi trapela.
Colonna a sé, `@unique`, nullable perché si genera su richiesta e non alla
registrazione, affiancata da `inboundTokenRotatedAt`.

### `Subscription`
Entità centrale. Oltre ai campi anagrafici porta due gruppi di attributi:

- **Ciclo e costo** — `amount` come `Decimal(12,2)`, `currency`, `billingCycle`,
  `nextRenewalDate` sempre a mezzanotte UTC
- **Attributi fiscali** — natura della spesa, se l'importo è lordo, aliquota IVA,
  percentuali di deducibilità e detraibilità, tipo di documento.
  Il loro uso è descritto in [[Calcolo_IVA_e_Fisco]]

Porta `canceledAt` (`null` = attivo): la disdetta è **logica**, il record non si
cancella. Regole di filtro e conseguenze in [[Soft_Delete_Abbonamenti]].

### `PaymentLog`
Storico dei pagamenti effettivi, alimentato dal cron dei rinnovi di
[[Gestione_Pagamenti_e_Rinnovi]] e, all'approvazione, dal canale email.

**Invariante: ogni riga è denaro che si è mosso.** Non è una descrizione, è un
vincolo di progetto da difendere. Lo storico del flusso di cassa, il Burn Rate e la
timeline dei pagamenti leggono questa tabella **senza filtrarla**, perché non c'è
niente da filtrare.

⚠️ Per questo non va aggiunto qui uno stato "in attesa di conferma". Righe non
confermate costringerebbero ogni lettore ad aggiungere una condizione, e
dimenticarla non darebbe un errore ma un totale gonfiato — la stessa classe di
guasto che il soft-delete ha insegnato a temere. Le proposte vivono in
`PaymentProposal`, una tabella che nessun calcolo somma.

Porta invece `source` (`CRON | EMAIL | MANUAL`), che è un'**etichetta e non un
filtro**: nessun calcolo deve selezionare per `source` per essere corretto, quindi
dimenticarsene non produce numeri sbagliati. È la distinzione che rende questa
colonna ammissibile dove uno `status` non lo sarebbe.

### `InboundEmail`
Registro dei messaggi ricevuti sull'indirizzo dedicato. È **il meccanismo
dell'idempotenza**, non un archivio di posta.

Ogni messaggio viene *rivendicato* qui prima di essere elaborato, con una
`dedupeKey` che è il `Message-ID` normalizzato o, quando manca, un hash del
contenuto (`dedupeSource` registra quale dei due, perché hanno garanzie diverse).

Due scelte di schema portano il peso dell'intera garanzia:

- **`@@unique([userId, dedupeKey])`.** L'unicità sta sul database e non in un
  controllo applicativo: `SELECT` poi `INSERT` sono due operazioni distinte, e due
  consegne concorrenti dello stesso messaggio le superano entrambe. Si tenta
  l'inserimento per primo e si intercetta la violazione.
- **Scope per utente, non globale.** La stessa ricevuta familiare inoltrata da due
  conviventi con account distinti è due fatti legittimi, non un duplicato.

Lo stato (`InboundStatus`) è una macchina in cui **solo `FAILED` è rielaborabile**:
rivendicare prima di elaborare protegge dal doppio lavoro, ma esporrebbe alla
perdita del messaggio se l'elaborazione crollasse a metà, e il contatore `attempts`
limita i tentativi.

⚠️ Del messaggio si conserva il minimo: mittente, oggetto, data, gli esiti
SPF/DKIM/ARC (`authResults`, segnale di fiducia mai di identità) e il risultato
strutturato dell'estrazione (`parsedData`). **Il corpo non viene archiviato**: è
posta di persone reali, e il modo più sicuro di trattare un dato sensibile è non
averlo.

### `PaymentProposal`
Pagamento estratto da una ricevuta, in attesa di approvazione. Una per messaggio
(`inboundEmailId @unique`).

Contiene tutto ciò che l'approvazione andrà a scrivere, così l'utente vede in
anticipo l'intera conseguenza del suo sì: importo, valuta e data; l'abbonamento
riconosciuto oppure `null` quando nessuno corrisponde (e allora l'approvazione
creerà anche l'abbonamento, partendo da `serviceName`); l'eventuale
`proposedPrice`; il punteggio e i `matchSignals` che l'hanno prodotto, perché una
proposta che non sa spiegarsi non è verificabile.

**L'evidenza vince sulla previsione**, ed è scritto nello schema. Il cron crea
`PaymentLog` su previsione, la ricevuta arriva come evidenza: se entrambi coprono
lo stesso ciclo il mese verrebbe contato due volte nel flusso di cassa. Approvare
quindi non crea sempre una riga nuova — `resolution` registra quale strada è stata
presa:

| `resolution` | Significato |
| ------------ | ----------- |
| `CREATED` | nessun pagamento esisteva per quel ciclo: ne è nato uno |
| `RECONCILED` | ne esisteva già uno (tipicamente da cron): **corretto**, non duplicato |

In entrambi i casi `paymentLogId` collega la proposta alla riga risultante, e la
relazione inversa su `PaymentLog` dice il resto: un pagamento con una proposta
collegata è corroborato da un documento reale, non solo previsto dal calendario.

### `SubscriptionMember`
Partecipanti di un abbonamento condiviso: email, stato dell'invito, peso della quota
e flag di saldo. Dominio descritto in [[Condivisione_Spese_e_Gruppi]].

### `ExpenseCategory`
Categorie con default fiscali suggeriti. Modellata ma non ancora operativa: vedi
[[Expense Category Actions]].

### Enum
`BillingCycle`, `InviteStatus`, `ExpenseNature`, `FiscalDocumentType`, `VatRegime`,
e per l'ingestione email `InboundStatus`, `DedupeSource`, `ProposalStatus`,
`ProposalResolution`, `PaymentSource`.

### Migrazioni
Stati successivi dello schema: impianto iniziale, split billing, impianto fiscale,
cessazione logica (`canceledAt`).

⚠️ **L'ingestione email non è ancora migrata.** I modelli sono nello schema e lo
schema è valido, ma la migrazione va generata contro il database reale: richiede
`DIRECT_URL`, che in locale non è disponibile per scelta (vedi i vincoli
d'ambiente in `AI_law_subsync.md`). È un passo di rilascio consapevole, non
automatico — `vercel.json` esclude `migrate deploy` dal build.

---

## Accesso ai dati

Il progetto separa nettamente lettura e scrittura, e non lascia che i componenti
parlino direttamente col database.

### Client Prisma
Istanza unica, esposta da un singleton per evitare la proliferazione di connessioni
in sviluppo con l'HMR. Server-only, sempre.

### Layer di lettura memoizzato
I fetcher sono avvolti in `React.cache`: la stessa richiesta di dati, ripetuta da
componenti diversi nello stesso render, produce **una sola query**. Coprono tre
famiglie: abbonamenti (elenco e singolo con filtro di ownership), pagamenti, membri
e inviti.

Il filtro di ownership non è opzionale: ogni fetcher riceve lo `userId` risolto da
[[Auth_Utenti_e_Sessioni_Supabase]] e ci filtra sopra.

### Scritture
Passano dalle Server Action dei rispettivi domini, mai dai componenti.
Ogni mutazione chiude con `revalidatePath`, come descritto in
[[Motore_Regole_NextJS]].

---

## Confine di serializzazione

I tipi di Prisma non attraversano la rete. Il modulo dei DTO definisce le forme che
la UI riceve e i mapper che le producono, convertendo `Decimal` e `Date` in `string`.

Regola pratica: **un campo nuovo va aggiunto al model, al DTO e al mapper**.
Saltare il terzo passaggio produce un errore di serializzazione al primo render.

---

## Regole di correttezza

Due invarianti valgono in tutto il progetto e sono la ragione per cui esistono due
moduli helper dedicati, entrambi coperti da test.

### Denaro sempre in Decimal
Nessun importo passa mai per `number`. Somme, divisioni per normalizzare un ciclo
annuale a mensile e aggregazioni operano su istanze `Decimal`. Il modulo espone
costruttore normalizzato a due decimali, costante zero, formattazione per la UI e
la ripartizione per pesi usata da [[Condivisione_Spese_e_Gruppi]], che distribuisce il resto in
centesimi col metodo del resto maggiore, così la somma delle quote è esatta.

Il motivo è banale ma non negoziabile: in virgola mobile `0.1 + 0.2` non fa `0.3`.

### Date di rinnovo a mezzanotte UTC
Ogni data di rinnovo è normalizzata prima del salvataggio e formattata senza
conversioni di fuso. Previene l'errore di un giorno che altrimenti compare a
seconda del fuso del browser. Il modulo espone anche l'avanzamento del ciclo,
usato dal cron.

### Lavori aperti
- **Migrazione dell'ingestione email**: i modelli sono nello schema, la migrazione
  no. Va generata contro il database reale, come passo di rilascio consapevole.
- **Giorno di ancoraggio del rinnovo**: l'avanzamento satura il giorno all'ultimo
  del mese, e la saturazione è irreversibile perché il giorno originale non è
  memorizzato — un mensile del 31 gennaio, passato per febbraio, resta al 28.
  Serve un campo `anchorDay` su `Subscription`. Dettagli in
  [[Gestione_Pagamenti_e_Rinnovi]].
- **Categorie di spesa**: modellate e mai usate, vedi [[Expense Category Actions]].
- **Normalizzazione multi-valuta** per aggregazioni cross-currency:
  [[Currency Normalizer]].

---

## Collegato a
[[Auth_Utenti_e_Sessioni_Supabase]] · [[Motore_Regole_NextJS]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Condivisione_Spese_e_Gruppi]] · [[Calcolo_IVA_e_Fisco]] · [[Soft_Delete_Abbonamenti]] · [[Email_Ingestion_e_Matching]]
