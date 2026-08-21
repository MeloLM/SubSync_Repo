# 2026-08-21 — Core System: AI_law_subsync.md e log modulari

Consolidamento di tutte le regole del progetto in un unico documento normativo e
abolizione del changelog cumulativo.

## File creati

- **`AI_law_subsync.md`** (root, ~12,5 KB, 31 sezioni): unico riferimento
  normativo. Struttura:
  - **Legge 0** — obbligo di leggere il file per intero prima di qualsiasi
    modifica al codice, in ogni sessione e per ogni task
  - **Parte I** — Regole architetturali 1-6, trasferite da `ARCHITECTURE.md`
    (Decimal, date UTC, `revalidatePath`, aggregazioni server-only, UI modulare,
    breakpoint vincolanti)
  - **Parte II** — Regola 7 riscritta: log modulari
  - **Parte III** — documentazione a macro-aree e grafo Obsidian, trasferita da
    `claude.md`
  - **Parte IV** — direttive operative (validazione con `pnpm build`, max 2
    tentativi, report di chiusura, fedeltà del resoconto, ambito)
  - **Parte V** — convenzioni di nomenclatura per codice, documentazione, log e
    commit, ricavate dalle convenzioni già in uso nel repo
  - **Parte VI** — vincoli di ambiente e build verificati sui file reali
    (`.env` / `.env.local`, `allowBuilds` di pnpm, divergenza fra lo script
    `build` e il `buildCommand` di `vercel.json`, testabilità delle Server Action)

- **`.agent-logs/` (8 file)**: il changelog cumulativo di Sprint 7 è stato diviso
  in un file per sessione, con nomenclatura `AAAA-MM-GG_slug`. Verifica di
  integrità: 172 righe non vuote nell'originale contro 165 nei nuovi file, delta
  pari ai 7 separatori `---` fra i blocchi. Nessun contenuto perso.

## File modificati

- **`ARCHITECTURE.md`**: rimosse le sezioni "Regole architetturali" (Regole 1-7),
  "Direttive Operative per l'Agente" e "Regola di manutenzione". Introduzione
  riscritta: ora dichiara di essere un documento **tecnico** e rimanda al
  normativo. Da 239 a 121 righe. Restano struttura delle cartelle, mappa Obsidian
  e schema relazionale.
- **`claude.md`**: ridotto a puntatore. Non contiene più regole proprie; esiste
  solo perché Claude Code lo carica automaticamente e deve indirizzare a
  `AI_law_subsync.md`.

## File eliminati

- **`.agent-logs/sprint-7-changelog.md`**: pattern abolito dalla nuova Regola 7.

## Nota di merito

`claude.md` non è stato eliminato ma svuotato: è il file che Claude Code carica in
automatico all'avvio: rimuoverlo avrebbe interrotto il caricamento delle istruzioni
di progetto, lasciando `AI_law_subsync.md` senza nessuno che lo indichi. Ridotto a
tre righe di rimando, non genera conflitti normativi.

## Verifica

Nessuna build necessaria: la modifica tocca solo file `.md`, esclusi dal bundle
Next.js. Nessun file di codice modificato. In attesa di conferma per il commit.
