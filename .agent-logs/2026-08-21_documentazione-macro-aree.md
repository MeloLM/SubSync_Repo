# 2026-08-21 (2) — Riorganizzazione della documentazione in macro-aree

Correzione dell'impostazione precedente: le 68 note 1:1 (una per file di codice)
producevano un grafo frammentato e ingestibile in manutenzione. Sostituite da
9 macro-aree gerarchiche più un indice centrale.

- **`docs/` (68 file eliminati, 10 creati)**: consolidamento per area logica.
  `Index.md` (MOC, nodo centrale), `Architettura_NextJS.md`,
  `Integrazione_Supabase.md`, `Modello_Dati_Prisma.md`, `Dominio_Abbonamenti.md`,
  `Split_Billing.md`, `Flusso_Fiscale.md`, `Scanner_AI_Ricevute.md`,
  `Componenti_UI_Dashboard.md`, `PWA_Offline.md`. Mantenuto
  `sprint-7-fiscalita.md` (non era una nota 1:1). Ogni macro-area usa titoli
  gerarchici e descrive flussi, modelli e responsabilità, non file fisici; le
  dipendenze sono ora logiche fra aree.
- **`ARCHITECTURE.md`**: sezione "Mappa Obsidian" riscritta da elenco di 68 note a
  mappa delle macro-aree, con rimando a `docs/Index.md` e la regola di manutenzione.
- **`TODO.md`**: i link alle vecchie note puntati alle macro-aree corrispondenti;
  i 9 ghost invariati; riga di legenda aggiornata.
- **`claude.md`**: riscritto. Ora vieta esplicitamente la creazione di note per
  singolo componente ed elenca le macro-aree da aggiornare, con la regola per
  introdurne di nuove e la gestione del ciclo di vita dei ghost.
- Verifica: nessuna build necessaria (solo file `.md`). Controllo di integrità del
  grafo: **10 note, 0 orfane**, tutti i link risolvono tranne i 9 ghost voluti
  (`Email Webhook`, `Receipt Parser`, `Payment Matcher`, `Fiscal Breakdown View`,
  `Expense Category Actions`, `Switch Suggester`, `Currency Normalizer`,
  `Burn Rate Offline Cache`, `Lighthouse Audit`). In attesa di conferma per il
  commit.
