# 2026-08-21 — Riallineamento globale e progettazione Soft-Delete / Email Ingestion

Nessun codice applicativo. Documentazione riportata alla realtà dei fatti e
terreno preparato per i due prossimi interventi sui dati.

## Riallineamento della documentazione base

- **`ARCHITECTURE.md`** — schema relazionale riscritto. Mancavano
  `SubscriptionMember` (Split-Billing, in produzione da Sprint 5) ed
  `ExpenseCategory`, e la tabella di `Subscription` si fermava ai campi
  originari, ignorando i sette attributi fiscali aggiunti in Sprint 7. Aggiunte
  entrambe le entità, completata `Subscription`, esplicitati i vincoli
  `onDelete: Cascade` e il fatto che il proprietario non è una riga di
  `SubscriptionMember`. Tolto "(bozza)" dal titolo: non lo è più.
- **`README.md`** — la roadmap parlava di 6 Sprint, lo Split-Billing era marcato
  _(roadmap B2B)_ ed erano assenti sia lo scanner IA sia il grafico del trend,
  entrambi in produzione. Tabella feature riscritta, stack aggiornato (Recharts,
  Gemini, Vitest, Vercel), e il rimando architetturale ora punta a
  `AI_law_subsync.md` come lettura obbligatoria invece che ad `ARCHITECTURE.md`.

## Riordino di TODO.md

- **Sprint 8 in cima e attivo**: Soft-Delete come obiettivo 1, Email Ingestion &
  Payment Matcher come obiettivo 2, in sequenza e non in parallelo.
- **Sprint 3, 4 e 5 chiusi sul consegnato**, con i residui spostati in un
  **Backlog consolidato** raggruppato per tema invece che per sprint di
  provenienza.
- **Sprint 7 chiuso e riscritto**: elencava solo quattro voci di refactoring UI e
  ignorava tutto ciò che è stato realmente consegnato (hardening scanner, pagine
  legali, trend con Recharts, sistema documentale). I quattro punti di UI sono
  scesi nel Backlog: restano 🔴 ma non bloccano il lavoro sui dati.
- **Toppa rimossa**: la voce "Hardening (S7)" era annidata dentro l'AI Scanner
  dello Sprint 4. Spostata nello Sprint 7, dove il lavoro è stato effettivamente
  svolto.
- Testata aggiornata: `Last Updated`, riga `Sprint attivo`, pipeline non più
  vincolata a "6 Sprint".

## Progettazione su Obsidian

Quattro nodi fantasma sono diventati due note reali:

- **`docs/Soft_Delete_Abbonamenti.md`** — assorbe `[[Storico Cessazioni
  Abbonamenti]]`. Documenta perché serve una data e non un booleano, la tabella
  dei filtri corretti per ciascun consumatore delle query, la condizione di
  appartenenza al mese estesa a intervallo per il trend, l'impatto su UI e
  migrazione. Segnalato un punto non ovvio: separare attivi e cessati in due
  fetcher significa due query per render sulla dashboard, dove oggi ce n'è una.
- **`docs/Email_Ingestion_e_Matching.md`** — assorbe `[[Email Webhook]]`,
  `[[Receipt Parser]]` e `[[Payment Matcher]]`. Documenta il flusso in quattro
  passi, i requisiti di riconducibilità all'utente e idempotenza, il matching
  trattato come punteggio con soglia e non come uguaglianza, e la scelta di non
  creare nulla d'autorità sotto soglia.

Agganciate a `docs/Index.md` (nuova sezione "In progettazione"), alla mappa di
`ARCHITECTURE.md` e alla tabella delle macro-aree di `AI_law_subsync.md`.
Aggiornati i rimandi in `Gestione_Pagamenti_e_Rinnovi`,
`Lettura_Scontrini_OCR_Gemini` e `Database_Tabelle_e_Modelli_Prisma`.

## Verifica

Nessuna build: il commit non contiene file di codice, l'albero sorgente è
identico a quello dell'ultimo build verde.

Integrità del grafo Obsidian: **12 note, 0 orfane**. I nodi fantasma scendono da
10 a 6 (`Fiscal Breakdown View`, `Expense Category Actions`, `Switch Suggester`,
`Currency Normalizer`, `Burn Rate Offline Cache`, `Lighthouse Audit`).

## Osservazione emersa

`README.md` include `![Dashboard Preview](/public/preview.png)`, ma quel file in
`public/` non esiste: l'immagine è rotta. È anche l'origine del `preview.png.md`
fantasma che Obsidian aveva creato e che abbiamo rimosso. Non l'ho toccata: va
deciso se produrre lo screenshot o togliere la riga.

## Stato

Pronti a scrivere il codice dello schema: `canceledAt` su `Subscription`.
