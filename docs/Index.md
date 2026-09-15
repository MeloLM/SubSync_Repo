# SubSync — Mappa della documentazione

Nodo centrale del vault. La documentazione è organizzata in **macro-aree**: una nota
per area logica del progetto, non per file di codice.

Per le regole architetturali vincolanti e la struttura delle cartelle,
vedi [[ARCHITECTURE]]. Per lo stato di avanzamento, [[TODO]].

---

## Fondamenta

Come è costruita l'applicazione, indipendentemente da cosa fa.

| Area | Copre |
| ---- | ----- |
| [[Motore_Regole_NextJS]] | Route group, confine server/client, cache e invalidazione, stati di errore e caricamento |
| [[Auth_Utenti_e_Sessioni_Supabase]] | Autenticazione, sessione, protezione delle rotte, sincronizzazione degli utenti |
| [[Database_Tabelle_e_Modelli_Prisma]] | Schema relazionale, layer di accesso ai dati, DTO, regole su denaro e date |

## Domini applicativi

Cosa fa il prodotto.

| Area | Copre |
| ---- | ----- |
| [[Gestione_Pagamenti_e_Rinnovi]] | CRUD, burn rate, andamento di spesa, rinnovi automatici, storico pagamenti |
| [[Condivisione_Spese_e_Gruppi]] | Condivisione fra utenti, inviti, ripartizione delle quote, settlement |
| [[Calcolo_IVA_e_Fisco]] | Deducibilità, IVA, categorie di spesa. **Incompleto** |
| [[Lettura_Scontrini_OCR_Gemini]] | Estrazione dati da fattura via Gemini, auto-fill del form |
| [[Soft_Delete_Abbonamenti]] | Cessazione logica, unico punto del filtro, trend che può scendere. **In produzione** |

## In progettazione

Aree disegnate e non ancora attive.

| Area | Copre | Stato |
| ---- | ----- | ----- |
| [[Email_Ingestion_e_Matching]] | Webhook, parsing, matching a punteggio, proposte da approvare | Modello chiuso e schema scritto; migrazione e webhook da fare |

## Interfaccia e distribuzione

| Area | Copre |
| ---- | ----- |
| [[Interfaccia_Grafica_Dashboard]] | Shell di navigazione, famiglie di componenti, regole responsive |
| [[App_Mobile_e_Offline_PWA]] | Manifest, service worker, installabilità, limiti offline |

## Approfondimenti

- [[sprint-7-fiscalita]] — analisi di dominio alla base di [[Calcolo_IVA_e_Fisco]]

---

## Lavori da fare

I nodi qui sotto sono **ghost**: compaiono nel grafo come cerchi vuoti perché
nessuna nota li descrive ancora. Sono lavoro pianificato, non documentazione
mancante.

### Fiscalità
[[Fiscal Breakdown View]] · [[Expense Category Actions]]
Il motore di calcolo esiste ma non è collegato a nulla. Vedi [[Calcolo_IVA_e_Fisco]].

### Ottimizzazione
[[Switch Suggester]] · [[Currency Normalizer]]
Suggerimento del cambio ciclo e aggregazioni multi-valuta.


### PWA
[[Burn Rate Offline Cache]] · [[Lighthouse Audit]]
Vedi [[App_Mobile_e_Offline_PWA]].

---

## Manutenzione

Le regole che governano questa documentazione (organizzazione a macro-aree, divieto
di creare note per singolo componente, struttura a cascata, ciclo di vita dei nodi
fantasma) non stanno qui: sono nel documento normativo del progetto,
**`AI_law_subsync.md`** nella root.
