# 2026-09-15 — Pulizia del codice orfano e allineamento della documentazione core

Congelamento dello stato prima dello stress-test con Docker.

## Codice morto: cercato, non tirato a indovinare

Prima constatazione, che cambia il peso della ricerca: **niente in questo progetto
segnala il codice inutilizzato.** `tsconfig.json` ha `strict: true` ma non
`noUnusedLocals` né `noUnusedParameters`, ed ESLint estende solo
`next/core-web-vitals`, che non attiva `no-unused-vars` per TypeScript. Lint e
`tsc` verdi non dicono nulla sugli orfani: possono esistere e sono esistiti.

Scritto uno scanner che, per ogni simbolo esportato da `lib/`, `actions/` e
`types/`, conta i riferimenti fuori dal file che lo dichiara, distinguendo gli usi
di produzione da quelli nei test. Risultato:

| Simbolo | Esito |
| ------- | ----- |
| `types/index.ts :: toPaymentLogDTO` | **rimosso** |
| `types/index.ts :: PaymentLogDTO` | **rimosso** |
| `lib/fiscal.ts` (3 export) | conservato — voce di backlog esistente |
| `actions/subscription.actions.ts :: reactivateSubscription` | conservato — voce di backlog creata oggi |

### `PaymentLogDTO` e `toPaymentLogDTO`

Un'interfaccia DTO e il suo mapper, entrambi con **zero riferimenti**. La timeline
dei pagamenti non li usa: `actions/payment.actions.ts` definisce un
`PaymentRowDTO` tutto suo, con il nome del servizio già risolto, che è ciò di cui
la vista ha davvero bisogno. Il DTO condiviso è rimasto indietro senza che nessuno
se ne accorgesse.

Rimossi entrambi, insieme all'import di `PaymentLog` da Prisma che serviva solo a
loro.

### Un falso positivo, per onestà del metodo

Lo scanner ha segnalato anche `actions/dev.actions.ts :: typeMoney`. Non esiste:
è la mia `sed` che ha collassato `import { money, type Money }` in un unico
identificatore. `Money` è usato alla riga 196. Nessuna azione — ma se avessi
"pulito" senza verificare avrei rotto la compilazione.

### Cosa NON ho rimosso

**`lib/fiscal.ts`** — 124 righe corrette, in `Decimal`, mai importate. Rimuoverlo è
una decisione di prodotto, non di manutenzione: c'è già una voce di backlog che
chiede di collegarlo a una vista. Resta, e resta segnalato.

**`reactivateSubscription`** — il task chiedeva esplicitamente di non implementare
la UI ma di spostare la voce nel backlog. La funzione resta, ed è ora il backlog a
giustificarne l'esistenza invece di uno sprint con una task appesa.

## Documentazione allineata

### `ARCHITECTURE.md`

- Eliminato l'avviso *"Manca una data di cessazione"*: il soft-delete è in
  produzione da oggi. Al suo posto la spiegazione di cosa fa `canceledAt` e del
  perché il filtro vive in un punto solo.
- `canceledAt` aggiunto alla tabella `Subscription`; `inboundToken` a `User`, con
  la nota sul perché è una colonna ruotabile e non lo `userId`.
- `PaymentLog`: aggiunta `source` e scritto l'**invariante** — ogni riga è denaro
  che si è mosso — con il motivo per cui un pagamento in attesa non può vivere lì.
- Nuove sezioni per `InboundEmail` e `PaymentProposal`, marcate "migrazione da
  eseguire".
- Schema relazionale e elenco delle relazioni aggiornati.
- **Albero delle cartelle**: era fermo allo Sprint 6. Mancavano
  `dashboard-charts.actions.ts`, `dev.actions.ts`, quattro moduli di `lib/`
  (`cash-flow`, `spending-trend`, `subscription-status`, `fiscal`) e tre cartelle
  di `components/`. Allineato al codice reale.
- Mappa Obsidian: `Soft_Delete_Abbonamenti` spostato da "In progettazione" a
  "Domini applicativi".

### `docs/Index.md`

Il nodo centrale del grafo classificava ancora il soft-delete sotto *"aree già
disegnate ma non ancora implementate: la nota esiste, il codice no"*, con priorità
"prossimo". Una mappa che dice "non implementato" su codice in produzione fa
sbagliare la prossima decisione: spostato fra i domini applicativi.

### `README.md`

Non era fra le azioni richieste in modo esplicito, ma il team lo aveva incluso nel
check-up. Tre righe erano diventate false:

- il trend "a 6 mesi del costo normalizzato" è ora due metriche, tre finestre,
  proiezione e selezione delle barre;
- l'Email Ingestion non è più "in progettazione" ma ha modello e schema pronti;
- i test non sono più solo "helper monetari e di data": sono 73 su cinque moduli.

Aggiunto anche che la disdetta è logica, che è il genere di cosa che un lettore del
README vuole sapere.

### `TODO.md`

Voce della UI di riattivazione spostata dallo Sprint 8 a una nuova sezione del
Backlog consolidato, *Abbonamenti cessati*, insieme al problema gemello già noto:
un abbonamento cessato resta modificabile conoscendone l'URL, perché
`getSubscription` non applica `isActive`.

## Verifica

- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx vitest run` — **exit 0**, 73 test su 5 file
- `npx next build` — **exit 0**
- Scanner degli orfani rieseguito dopo la pulizia: `toPaymentLogDTO` non compare
  più, restano solo i due conservati di proposito.

## Osservazione emersa

⚠️ **Il progetto è cieco sul codice inutilizzato.** Questa pulizia è stata fatta a
mano con uno script usa-e-getta, e fra un mese il problema si riformerà. Due righe
in `tsconfig.json` (`noUnusedLocals`, `noUnusedParameters`) intercetterebbero
almeno le variabili e gli import morti dentro i file; gli export orfani fra file
richiedono altro (`knip`, `ts-prune`). Non l'ho fatto perché cambierebbe la
configurazione di compilazione di tutto il progetto e potrebbe far fallire la build
su file che non ho scritto io: è una decisione da prendere, non da infilare in un
commit di manutenzione.

## Stato

Commit di manutenzione. Working tree pulito.
