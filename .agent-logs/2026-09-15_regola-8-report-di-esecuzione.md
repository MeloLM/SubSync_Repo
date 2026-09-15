# 2026-09-15 — Regola 8: obbligo di report di esecuzione

Istituzionalizzazione del formato di report usato finora in via informale.

## Dove è stata messa, e perché non in una Parte nuova

La scelta naturale sarebbe stata una Parte III dedicata, con rinumerazione di
tutte le successive. **Non è stata fatta**, per una ragione che riguarda proprio
la Regola 7: i file di `.agent-logs/` sono immutabili una volta scritti, e diversi
di essi citano le parti per numero ("Parte VI di `AI_law_subsync.md`", sui vincoli
d'ambiente). Anche `lib/cash-flow.ts` e `lib/spending-trend.ts` lo fanno nei
docblock. Rinumerare avrebbe reso false decine di citazioni in file che per regola
non si possono correggere.

La Regola 8 è quindi entrata nella **Parte II**, rinominata da "Regola 7: diario
di bordo modulare" a "Regole 7 e 8: diario di bordo e report di esecuzione", con
un'introduzione che spiega perché le due stanno insieme: tracciano lo stesso lavoro
per due destinatari diversi — il repository fra sei mesi, il committente adesso — e
nessuna sostituisce l'altra.

## File modificati

- **`AI_law_subsync.md`**
  - Parte II rinominata, con cappello introduttivo sulle due regole.
  - `### Regola 7 — Diario di bordo modulare` come sottosezione; le sue due
    sottosezioni scalate da `###` a `####` per non appiattire la gerarchia.
  - **`### Regola 8 — Report di esecuzione`**: cinque voci obbligatorie (esito
    validazione con `tsc`/lint/`vitest`, stato del working tree, commit effettuati,
    deviazioni dal piano, aggiornamento del log), più una sezione "Cosa il report
    non è".
  - Parte IV, "Report di chiusura": la vecchia formulazione in tre punti elencava
    una forma di report concorrente. Sostituita da un rimando alla Regola 8, come
    impone la chiusa del documento stesso ("Due regole che dicono cose diverse sono
    peggio di nessuna regola"). Resta solo l'aggiunta specifica di quella parte: la
    prossima task logica in coda.

## Scelte di contenuto

**Le cinque voci sono obbligatorie anche quando vuote.** Scritto esplicitamente:
una voce omessa si legge come una voce negativa, e sarebbe una bugia per omissione.
Se non ci sono deviazioni, si scrive che non ce ne sono.

**Le deroghe alle regole rientrano fra le deviazioni.** Aggiunto perché era il caso
concreto più recente: la somma della selezione nel grafico è la prima aggregazione
monetaria sul client, deroga alla Regola 4 segnalata nel report ma priva, fino a
oggi, di una regola che ne imponesse la segnalazione.

**"Cosa il report non è"** richiama la Parte IV sulla fedeltà del resoconto e
chiarisce che il report non sostituisce il diario di bordo: uno è immutabile e vive
nel repository, l'altro vive nella conversazione.

## Verifica

Modifica esclusivamente documentale: nessun file di codice toccato, quindi nessuna
build necessaria. La suite è stata comunque eseguita per accertare che il
repository resti verde prima di aprire la sequenza di commit.

- `npx vitest run` — **exit 0**, 73 test su 5 file
- `npx tsc --noEmit` — **exit 0**

## Stato

Primo di tre commit della sessione (Regola 8, banner PWA, profilo).
