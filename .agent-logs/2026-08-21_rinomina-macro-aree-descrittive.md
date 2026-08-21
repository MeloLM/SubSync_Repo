# 2026-08-21 — Rinomina delle macro-aree con nomi descrittivi

I nomi delle macro-aree in `docs/` erano troppo astratti per far capire a colpo
d'occhio quale feature governano. Rinominati secondo lo schema fornito dal team,
con propagazione dei link a tutto il vault.

## File rinominati (9)

| Prima | Dopo |
| ----- | ---- |
| `Architettura_NextJS.md` | `Motore_Regole_NextJS.md` |
| `Integrazione_Supabase.md` | `Auth_Utenti_e_Sessioni_Supabase.md` |
| `Modello_Dati_Prisma.md` | `Database_Tabelle_e_Modelli_Prisma.md` |
| `Dominio_Abbonamenti.md` | `Gestione_Pagamenti_e_Rinnovi.md` |
| `Split_Billing.md` | `Condivisione_Spese_e_Gruppi.md` |
| `Flusso_Fiscale.md` | `Calcolo_IVA_e_Fisco.md` |
| `Scanner_AI_Ricevute.md` | `Lettura_Scontrini_OCR_Gemini.md` |
| `Componenti_UI_Dashboard.md` | `Interfaccia_Grafica_Dashboard.md` |
| `PWA_Offline.md` | `App_Mobile_e_Offline_PWA.md` |

I nuovi nomi rispettano la convenzione `Snake_Case` con iniziali maiuscole
(Parte V di `AI_law_subsync.md`). Rinominati con `mv`, non `git mv`: le note sono
ancora untracked, quindi per git risultano semplicemente nuovi percorsi.

## Propagazione dei link

Sostituiti tutti i riferimenti in:

- **`docs/*.md`** — link incrociati fra le note, righe "Collegato a", rimandi in
  prosa
- **`docs/Index.md`** — tabelle delle tre sezioni (Fondamenta, Domini applicativi,
  Interfaccia e distribuzione) e sezione Approfondimenti
- **`ARCHITECTURE.md`** — sezione "Mappa Obsidian (macro-aree)"
- **`TODO.md`** — link delle task aperte alle aree corrispondenti
- **`AI_law_subsync.md`** — tabella delle macro-aree in Parte III ed esempio di
  nomenclatura in Parte V

Quest'ultimo non era nell'elenco richiesto, ma il documento normativo elencava i
nomi vecchi: lasciarlo intatto avrebbe creato esattamente la divergenza fra regole
che la sezione "Modifica di questo documento" vieta.

## Titoli H1 allineati

Aggiornato anche il titolo interno di ogni nota, che altrimenti avrebbe continuato
a chiamarsi col nome vecchio mentre il file diceva altro (es. il file
`Gestione_Pagamenti_e_Rinnovi.md` si apriva con "# Dominio Abbonamenti"). I titoli
usano la forma leggibile del nuovo nome, es. "# Auth, Utenti e Sessioni (Supabase)".

## File deliberatamente NON modificati

- **`.agent-logs/2026-08-21_documentazione-macro-aree.md`** e
  **`.agent-logs/2026-08-21_pagine-legali-definitive.md`**: citano i nomi vecchi,
  ma sono log già scritti. La Regola 7 stabilisce che un file di log non si
  modifica più: sono registrazioni storiche, ed erano corretti nel momento in cui
  sono stati scritti.
- **`.obsidian/workspace.json`**: stato della UI di Obsidian (tab aperti), si
  rigenera da solo all'apertura del vault.

## Verifica

Controllo di integrità del grafo dopo la rinomina:

- **10 note in `docs/`**, tutte raggiungibili: **0 note orfane**
- **0 riferimenti residui** ai nomi vecchi in `docs/`, `ARCHITECTURE.md`,
  `TODO.md`, `AI_law_subsync.md`
- Tutti i wikilink risolvono, tranne i 9 nodi fantasma previsti
  (`Email Webhook`, `Receipt Parser`, `Payment Matcher`, `Fiscal Breakdown View`,
  `Expense Category Actions`, `Switch Suggester`, `Currency Normalizer`,
  `Burn Rate Offline Cache`, `Lighthouse Audit`), invariati

Nessuna build eseguita: la modifica tocca solo file `.md`, esclusi dal bundle
Next.js, e non è stato toccato alcun file di codice. Restano nel working tree le
modifiche alle pagine legali del task precedente, ancora in attesa dell'esito del
test OCR per il commit unico.
