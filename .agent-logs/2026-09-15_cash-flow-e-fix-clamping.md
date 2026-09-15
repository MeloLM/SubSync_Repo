# 2026-09-15 — Flusso di cassa dinamico e fix della saturazione delle date

Sprint 8 obiettivo 2. Il grafico passa da una metrica a due (competenza e cassa),
da una finestra fissa a tre selezionabili, e dal solo passato a passato +
proiezione. Prima di tutto questo, però, c'era un bug di fatturazione da chiudere.

## Il bug che ha cambiato l'ordine delle mosse

`advanceRenewalDate` usava `Date.UTC(y, m + 1, d)`. Con `d = 31` su febbraio il
giorno **trabocca** invece di saturare: il 31 gennaio diventava il 3 marzo.
Conseguenze, verificate eseguendo la funzione prima di toccarla:

```
MONTHLY dal 31 gennaio 2026:  → 2026-03-03 → 2026-04-03 → 2026-05-03 …
MONTHLY dal 30 gennaio 2026:  → 2026-03-02 → 2026-04-02 …
YEARLY dal 29 febbraio 2028:  → 2029-03-01
```

**Febbraio spariva del tutto** e l'abbonamento migrava in modo permanente al
giorno 3. È un bug di fatturazione preesistente, in produzione, che il cron
esercita a ogni rinnovo: invisibile finché nessuno guardava le date future, e
inevitabile appena si costruisce una proiezione che su quelle date si fonda.

Corretto con la semantica di ogni sistema di billing reale, il **clamping**: se il
giorno non esiste nel mese si satura all'ultimo disponibile. 31 gen → 28 feb (29
se bisestile).

## Deviazione dal piano approvato, e perché

Il piano prevedeva di enumerare le occorrenze **dal giorno di ancoraggio**, così
che il 31 gennaio desse 28 febbraio e poi tornasse al 31 marzo. Implementandolo è
emerso che quella previsione sarebbe stata più elegante ma **falsa**: il giorno di
ancoraggio non è memorizzato da nessuna parte, quindi il cron — che ha in mano solo
`nextRenewalDate` — dopo la saturazione proseguirà sul 28, non tornerà al 31.

Fra una previsione elegante e una previsione vera si è scelta la seconda:
`renewalOccurrencesInWindow` itera **la stessa funzione che userà il cron**. Così
grafico e cron non possono divergere per costruzione. È esattamente lo scenario
"due verità sullo stesso dato" segnalato come il peggiore in fase di piano, e
ricalcolare dall'ancora l'avrebbe reintrodotto da un'altra porta.

Resta una deriva residua — dopo un mese corto il 31 diventa 28 e non torna — il cui
fix richiede un campo `anchorDay` sullo schema. Registrata in `TODO.md`, fuori
ambito qui.

## File modificati

- **`lib/date.ts`** — `advanceRenewalDate` satura invece di traboccare. Aggiunti
  `daysInUtcMonth`, `utcDateClamped`, `addDaysUTC`, `monthKeyUTC`, `dayKeyUTC`,
  `formatUTC` e soprattutto **`buildMonthBuckets`**: lo scheletro temporale
  condiviso (finestre passate, future o a cavallo del presente), estratto qui e non
  in `spending-trend.ts` perché è calendario, non metrica — e perché farlo
  importare dal modulo della competenza avrebbe legato la cassa al suo opposto.
- **`lib/spending-trend.ts`** — riscritto sopra i bucket. Nuova primitiva
  `computeNormalizedSeries(subs, buckets)`; `computeNormalizedTrend(subs, now,
  months)` resta come zucchero a firma invariata, così i test preesistenti non si
  toccano. Scoperta utile: `wasActiveInPeriod` si estende ai mesi futuri senza
  trattamenti speciali, quindi la proiezione per competenza (linea piatta al Burn
  Rate) esce gratis.
- **`lib/data/payments.ts`** — `getPaymentsByUserInRange`. Fetcher distinto e non
  filtro in memoria su `getPaymentsByUser`: quello legge tutto lo storico per la
  timeline, e farci sopra un grafico trasferirebbe ogni pagamento mai avvenuto a
  ogni render. Estremi passati come epoch in ms, non `Date`: `React.cache` memoizza
  per identità degli argomenti e due `Date` equivalenti sarebbero due chiavi.
- **`types/index.ts`** — `SpendingTrendPoint`/`SpendingTrendDTO` sostituiti da
  `ChartPointDTO` / `ChartSeriesDTO` / `DashboardChartsDTO`. I vecchi rimossi, non
  affiancati: erano già senza consumatori dopo la sostituzione.
- **`components/dashboard/spending-chart.tsx`** — due selettori, cinque serie,
  distinzione consolidato/proiettato. Alleggerito estraendo toggle e tooltip.
- **`components/dashboard/spending-chart-loader.tsx`** — tipo aggiornato e
  placeholder esteso ai selettori, per non reintrodurre layout shift.
- **`app/(dashboard)/page.tsx`** — nuova action; titolo della card da "Trend di
  spesa — costo mensile normalizzato" a "Andamento della spesa", perché la
  normalizzazione ora è una delle due metriche e non più *la* metrica.
- **`docs/Gestione_Pagamenti_e_Rinnovi.md`** — riscritta la sezione metriche
  (competenza vs cassa, provenienza dei dati, finestre, confine); aggiunta la
  saturazione di fine mese ai rinnovi automatici. Corretto anche un residuo che
  dichiarava inesistente il soft-delete già in produzione.
- **`docs/Interfaccia_Grafica_Dashboard.md`** — selettori, stato della vista,
  consolidato/proiettato.
- **`TODO.md`** — nuovo obiettivo 2 di Sprint 8, Email Ingestion rinumerato a 3.

## File creati

- **`lib/cash-flow.ts`** — `renewalOccurrencesInWindow`,
  `computeProjectedCashFlow`, `computeHistoricalCashFlow`,
  `computeCashFlowSeries`, `computeUpcomingRenewals`.
- **`lib/cash-flow.test.ts`** — 21 test, incluso l'invariante Σ cassa === Σ
  competenza === Burn Rate × 12, che dimostra che la proiezione non inventa né
  perde denaro.
- **`actions/dashboard-charts.actions.ts`** — compone le cinque serie in una sola
  lettura. Sostituisce `actions/spending-trend.actions.ts`, rimosso.
- **`components/dashboard/chart-toggle.tsx`** — selettore segmentato generico,
  mobile-first (Regola 5: il grafico con due selettori dentro sarebbe diventato il
  monolite che la regola vieta).
- **`components/dashboard/chart-tooltip.tsx`** — tooltip disaccoppiato da Recharts.

## Decisioni degne di nota

**Il filtro degli attivi è speculare fra le due metriche.** La competenza vuole
anche i cessati (per sapere in quali mesi contribuivano), la cassa proietta solo
gli attivi (un disdetto non ha rinnovi futuri), lo storico di cassa non filtra
affatto (i `PaymentLog` sono fatti avvenuti). Scritto nei docblock di entrambi i
moduli, perché è il genere di simmetria che qualcuno applicherà per analogia
invertendola.

**Confine consolidato/proiettato alla mezzanotte di domani.** Il cron gira alle
06:00 e data il `PaymentLog` al giorno del rinnovo: con il confine lì, un rinnovo
di oggi è coperto dallo storico se il cron è passato e la proiezione non lo
riconta. Se il cron non è ancora passato l'addebito di oggi resta fuori da entrambe
le metà per poche ore — sottostima accettata, preferibile a un totale gonfiato che
nulla segnalerebbe.

**Tutte le serie precalcolate sul server.** Nascono dalla stessa SELECT memoizzata,
quindi cinque serie costano quanto una; il client sceglie quale disegnare, e
cambiare vista non è un round-trip. Scegliere fra serie già aggregate non viola la
Regola 4, ricalcolarle sì.

**Nessun `AreaChart`, come da decisione del team.** L'argomento già presente nel
componente ("un'area interpolerebbe valori inesistenti") è più forte sulla cassa,
non più debole: fra un picco e l'altro il valore reale è zero.

## Verifica

- `npx vitest run` — **exit 0**, **71 test su 5 file** (35 preesistenti + 36 nuovi:
  15 su `date`, 21 su `cash-flow`). Ripartizione per file: `cash-flow` 21, `date`
  20, `spending-trend` 13, `subscription-status` 10, `money` 7.
- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx next build` — **exit 0**. First Load JS della dashboard **88,8 kB**
  (era 88,7): il code-splitting di Recharts regge, i selettori non lo hanno rotto.

Usato `next build` e non `pnpm build`: quest'ultimo include `prisma migrate
deploy`, che su `.env` volutamente vuoto fallirebbe. È la stessa ragione per cui la
CI usa `next build` (Parte VI di `AI_law_subsync.md`).

## Osservazioni emerse

⚠️ **Nessun collaudo visivo.** Test, tipi, lint e build sono verdi, ma il grafico
non è stato aperto in un browser: la finestra annuale mette 12 barre su viewport
stretto e la leggibilità delle etichette dell'asse X va guardata con gli occhi.
Registrato come task aperta in `TODO.md`.

⚠️ **La deriva di ancoraggio resta.** Vedi sopra: serve `anchorDay` sullo schema.

⚠️ **Multi-valuta.** I totali sommano importi di valute diverse senza convertirli,
come già il Burn Rate. Inaccuratezza accettata dal team in questo passaggio,
rimandata a `[[Currency Normalizer]]`. Vale la pena notare che la proiezione la
rende più visibile: qui si sommano importi **pieni**, non medie.

## Stato

Test, tipi, lint e build verdi. Working tree pulito dopo il commit.
