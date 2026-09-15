# 2026-09-15 — Rifinitura UX del grafico: asse continuo, testi e selezione

Secondo blocco della giornata, tutto dal collaudo visivo: i calcoli erano
corretti, la lettura no. Tre rilievi, tre correzioni.

## 1. L'asse X della vista a 30 giorni mentiva

`computeUpcomingRenewals` restituiva **solo i giorni con un addebito**. Recharts
li disegnava accostati, quindi tre spese il 3, il 4 e il 5 del mese producevano
esattamente lo stesso grafico di tre spese il 3, il 15 e il 28: tre colonne
equidistanti. La dimensione temporale, cioè l'intera ragione della vista
giornaliera, spariva.

Rovesciato l'ordine di costruzione: prima lo scheletro di tutti i giorni a zero,
poi il riempimento — lo stesso schema che la serie mensile già usava con
`emptySeries`. Funzione rinominata in **`computeDailyCashFlow`**, perché non
restituisce più "i prossimi rinnovi" ma un calendario continuo.

## 2. I testi erano scritti per un contabile

Competenza e cassa sono i termini giusti e restano nel codice e in
`docs/Gestione_Pagamenti_e_Rinnovi.md`, dove la distinzione va tenuta netta. Sullo
schermo diventano la domanda a cui ogni vista risponde:

| Prima | Dopo |
| --- | --- |
| Competenza | **Spesa media** |
| Cassa | **Addebiti reali** |
| 1M / 6M / 1A | **30 giorni / 6 mesi / 1 anno** |
| "Costo normalizzato, ultimi 6 mesi" | "Quanto spendi in media ogni mese, ultimi 6 mesi" |
| "Uscite reali, ultimi 6 mesi" | "Quanto è uscito davvero dal conto, ultimi 6 mesi" |
| "Addebiti previsti, prossimi 30 giorni" | "Cosa ti viene addebitato, giorno per giorno" |
| "barre attenuate: proiezione" | "barre chiare: previsione" |
| tooltip "proiettato" | tooltip "previsto" |

Anche le etichette dei gruppi per screen reader: "Metrica" → "Tipo di spesa",
"Finestra temporale" → "Periodo".

## 3. Selezione interattiva

Stato locale `Set<string>` sulle chiavi dei punti. Click su una barra per
includerla o escluderla; il footer passa da "Totale del periodo" a "Totale
selezione · N" con un pulsante **Azzera** accanto alla cifra.

### Tre decisioni dentro una feature semplice

**La selezione si azzera al cambio di vista.** Le chiavi appartengono alla serie
che le ha prodotte, e alcune sono condivise fra finestre (un `monthKey` esiste sia
a 6 mesi sia a 1 anno) mentre altre no. Passando da una vista mensile a quella
giornaliera nessuna chiave selezionata avrebbe più trovato un punto: la selezione
sarebbe rimasta invisibile ma `selection.size > 0`, quindi le barre si sarebbero
attenuate tutte e il footer avrebbe mostrato un totale di zero euro senza che
niente lo spiegasse.

**Con una selezione attiva è lei a comandare l'opacità**, sovrascrivendo la
distinzione consolidato/previsto. Due gerarchie visive sulla stessa proprietà non
si leggono: quella che risponde al dito dell'utente vince.

**Parità da tastiera.** Le barre sono `<rect>` SVG dentro Recharts e non sono
raggiungibili con Tab. Aggiunto un gruppo di pulsanti, uno per punto, in `sr-only`
con `focus:not-sr-only`: invisibili finché non ricevono il focus, poi visibili e
operabili. Senza, la feature sarebbe stata solo per chi usa un mouse.

## ⚠️ L'unica aggregazione monetaria sul client

La somma della selezione dipende da cosa l'utente tocca, quindi non è
precalcolabile sul server senza un round-trip a ogni click. È una **deroga
consapevole alla Regola 4**, e va segnalata come tale: è la prima volta che un
componente somma denaro.

Quello che non si deroga è la **Regola 1**. La somma avviene su **centesimi
interi** tramite un helper `toCents` che fa il parsing della stringa a due decimali
del DTO senza passare da `Number(x) * 100` — che reintrodurrebbe la virgola mobile
proprio nel punto che si vuole proteggere. Gli interi sono esatti in JavaScript
fino a 2^53, cioè ben oltre qualunque importo realistico, e la divisione per cento
arriva solo alla fine, al confine di presentazione, esattamente come fa
`formatMoney` lato server.

Se il team preferisce non avere alcuna aritmetica monetaria sul client,
l'alternativa è precalcolare i totali di ogni sottoinsieme — impraticabile — o una
Server Action per click. Segnalo la deroga, non la nascondo.

## File modificati

- **`lib/cash-flow.ts`** — `computeUpcomingRenewals` → `computeDailyCashFlow`,
  scheletro completo dei giorni. Docblock con la ragione del cambio.
- **`lib/cash-flow.test.ts`** — i 4 test sulla vista giornaliera diventano 6 e
  cambiano di segno: da "scarta i giorni vuoti" a "restituisce un punto per ogni
  giorno", più un test che verifica l'assenza di buchi a cavallo del mese.
- **`actions/dashboard-charts.actions.ts`** — chiamata aggiornata.
- **`components/dashboard/spending-chart.tsx`** — testi, selezione, somma
  dinamica, `toCents`, pulsanti da tastiera, footer ristrutturato.
- **`types/index.ts`**, **`docs/Gestione_Pagamenti_e_Rinnovi.md`**,
  **`docs/Interfaccia_Grafica_Dashboard.md`**, **`TODO.md`** — allineati. In
  particolare la riga "I giorni senza addebiti non entrano nella serie" era
  diventata falsa con questa modifica.

## Verifica

- `npx vitest run` — **exit 0**, **73 test su 5 file** (71 + 2 nuovi sulla vista
  giornaliera)
- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx next build` — **exit 0**. First Load JS della dashboard **88,8 kB**,
  invariato: la selezione non ha aggiunto peso misurabile.

## Osservazioni emerse

⚠️ **Questa rifinitura non è stata collaudata visivamente.** Ironico, visto che
nasce da un collaudo visivo. Tre cose vanno guardate con gli occhi:

1. **30 barre su viewport stretto.** `interval="preserveStartEnd"` con
   `minTickGap` portato da 6 a 16 dovrebbe diradare le etichette dell'asse X, ma è
   una stima, non una verifica.
2. **I pulsanti `focus:not-sr-only`.** Quando ricevono il focus diventano visibili
   e occupano spazio: va controllato che non spostino il layout in modo brusco.
3. **Il click sulle barre a zero** nella vista giornaliera: hanno altezza nulla,
   quindi col dito sono di fatto irraggiungibili. Selezionabili solo da tastiera.
   Non è un bug — sommare zero non cambia niente — ma è un'asimmetria da conoscere.

⚠️ `resolveKey` legge la chiave del punto in tre modi (campo diretto, `payload`
annidato, indice) perché Recharts espone l'argomento di `onClick` in forme diverse
a seconda della versione. Il fallback sull'indice è sempre corretto, quindi la
funzione non può fallire, ma è codice difensivo che esiste solo perché non ho
potuto verificare in un browser quale forma arrivi davvero.

## Stato

Test, tipi, lint e build verdi. Working tree pulito dopo il commit.
