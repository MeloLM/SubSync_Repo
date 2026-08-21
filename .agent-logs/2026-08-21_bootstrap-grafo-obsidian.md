# 2026-08-21 — Mappa Obsidian: bootstrap del grafo delle dipendenze

Nessuna modifica al codice applicativo: intervento di sola documentazione, per
attivare le regole di `claude.md` (mappatura componenti, tracciamento dipendenze
via `[[link]]`, nodi fantasma).

- **`docs/` (+68 note)**: una nota per ogni file logico rilevante di `app/`,
  `components/`, `actions/`, `lib/`, `prisma/`, `supabase/` e `middleware.ts`.
  Ogni nota dichiara percorso reale, tipo (Server/Client Component, action,
  helper), ruolo, **Dipende da** e **Usato da**. Le dipendenze non sono state
  dedotte a mano: estratte dagli `import` effettivi di ogni file.
  - Collisione di nomi risolta: `actions/subscription.actions.ts` →
    `SubscriptionActions`, mentre il componente
    `components/subscriptions/subscription-actions.tsx` →
    `SubscriptionActionsMenu` (con nota di rimando incrociata).
- **`ARCHITECTURE.md`**: nuova sezione **"Mappa Obsidian (grafo delle dipendenze)"**
  fra la struttura delle cartelle e le Regole architetturali. È il nodo centrale
  del grafo (linka tutte le 68 note, raggruppate per strato) e contiene la tabella
  dei 9 nodi fantasma con sprint e dipendenza reale più vicina. Chiude con la
  regola di manutenzione (nota creata nella stessa sessione del file).
- **`TODO.md`**: le task aperte ora linkano il nodo corrispondente — ghost per il
  lavoro da fare (`[[Email Webhook]]`, `[[Receipt Parser]]`, `[[Payment Matcher]]`,
  `[[Fiscal Breakdown View]]`, `[[Expense Category Actions]]`, `[[Switch Suggester]]`,
  `[[Currency Normalizer]]`, `[[Burn Rate Offline Cache]]`, `[[Lighthouse Audit]]`),
  note reali per le task di refactoring dello Sprint 7. Aggiunta la riga di legenda
  sul significato dei nodi.
- **Osservazione emersa dalla mappatura**: `lib/fiscal.ts` è completo lato calcolo
  (`computeFiscalBreakdown`, `effectiveVatRate`, DTO) ma **non è importato da
  nessun file**, e il model `ExpenseCategory` esiste in `schema.prisma` senza
  Server Action né UI. Nel grafo appaiono come nodo isolato + ghost: è la
  Fiscalità dello Sprint 5, ferma a metà strada. Annotato in `Fiscal.md`,
  `PrismaSchema.md` e `TODO.md`.
- Verifica: nessuna build necessaria (solo file `.md`, esclusi dal bundle Next.js).
  Controllo di integrità del grafo eseguito: **0 note orfane**, tutti i link
  risolvono tranne i 9 ghost voluti. In attesa di conferma per il commit.
