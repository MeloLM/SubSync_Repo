# Database, Tabelle e Modelli (Prisma)

Schema relazionale, layer di accesso ai dati e regole di correttezza su denaro e date.
È la base su cui poggiano tutti i domini applicativi.

Nodo padre: [[Index]]

---

## Schema relazionale

```
User (1) ──< (N) Subscription (1) ──< (N) PaymentLog
                      │
                      └──< (N) SubscriptionMember
User (1) ──< (N) ExpenseCategory ──> (N) Subscription
```

### `User`
Identità applicativa. L'`id` è allineato a quello Supabase e popolato dal trigger
descritto in [[Auth_Utenti_e_Sessioni_Supabase]]. Da qui pendono abbonamenti, membership di
condivisione e categorie di spesa.

### `Subscription`
Entità centrale. Oltre ai campi anagrafici porta due gruppi di attributi:

- **Ciclo e costo** — `amount` come `Decimal(12,2)`, `currency`, `billingCycle`,
  `nextRenewalDate` sempre a mezzanotte UTC
- **Attributi fiscali** — natura della spesa, se l'importo è lordo, aliquota IVA,
  percentuali di deducibilità e detraibilità, tipo di documento.
  Il loro uso è descritto in [[Calcolo_IVA_e_Fisco]]

### `PaymentLog`
Storico dei pagamenti effettivi, alimentato dal cron dei rinnovi di
[[Gestione_Pagamenti_e_Rinnovi]] e, in futuro, dal canale email.

### `SubscriptionMember`
Partecipanti di un abbonamento condiviso: email, stato dell'invito, peso della quota
e flag di saldo. Dominio descritto in [[Condivisione_Spese_e_Gruppi]].

### `ExpenseCategory`
Categorie con default fiscali suggeriti. Modellata ma non ancora operativa: vedi
[[Expense Category Actions]].

### Enum
`BillingCycle`, `InviteStatus`, `ExpenseNature`, `FiscalDocumentType`, `VatRegime`.

### Migrazioni
Tre stati successivi dello schema: impianto iniziale, split billing, impianto fiscale.

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
La normalizzazione multi-valuta per aggregazioni cross-currency non esiste ancora:
[[Currency Normalizer]].

---

## Collegato a
[[Auth_Utenti_e_Sessioni_Supabase]] · [[Motore_Regole_NextJS]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Condivisione_Spese_e_Gruppi]] · [[Calcolo_IVA_e_Fisco]]
