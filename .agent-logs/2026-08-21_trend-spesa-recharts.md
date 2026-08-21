# 2026-08-21 — Trend di spesa a 6 mesi con Recharts

Il grafico del trend esisteva già, ma calcolava una metrica diversa da quella
richiesta. Questo intervento cambia la metrica e sostituisce il rendering.

## Situazione di partenza

`actions/spending-trend.actions.ts` e `components/dashboard/spending-trend-chart.tsx`
erano già implementati e integrati in dashboard, con finestra a 6 mesi. La serie
però aggregava i **`PaymentLog` reali**: un abbonamento annuale appariva come un
picco isolato nel mese del rinnovo, incoerente col Monthly Burn Rate. Il grafico
era in CSS/Tailwind, senza librerie.

## Dipendenza installata

`recharts@3.10.1`. Nessun install-script, quindi `allowBuilds` di
`pnpm-workspace.yaml` non richiede aggiornamenti (Parte VI).

## File creati

- **`lib/spending-trend.ts`** — helper puro: `normalizedMonthlyCost` e
  `computeNormalizedTrend`. Riceve gli abbonamenti già letti, non tocca il
  database, quindi resta testabile in isolamento. Tutto in `Prisma.Decimal`.
- **`lib/spending-trend.test.ts`** — 8 test, sulla falsariga di `money.test.ts` e
  `date.test.ts`. Coprono normalizzazione annuale, assenza di arrotondamenti
  intermedi, ampiezza e ordine della finestra, esclusione degli abbonamenti
  creati dopo il mese, il caso limite dell'ultimo istante del mese e l'ancoraggio
  UTC delle etichette.
- **`components/dashboard/spending-chart.tsx`** — `BarChart` Recharts dentro
  `ResponsiveContainer`, gradiente ciano→viola dal design system, griglia
  orizzontale, tooltip custom su `subsync-bg`, mese corrente a piena opacità.

## File modificati

- **`actions/spending-trend.actions.ts`** — riscritta sull'helper. Non legge più
  `getPaymentsByUser`: ora usa solo `getSubscriptionsByUser`, lo stesso fetcher
  memoizzato di Burn Rate e lista, quindi la dashboard resta a una sola SELECT
  su `Subscription`.
- **`types/index.ts`** — `SpendingTrendPoint.monthLabel` rinominato in `name`,
  che è il `dataKey` idiomatico di Recharts per l'asse X. Commenti allineati alla
  nuova metrica.
- **`app/(dashboard)/page.tsx`** — import e uso del nuovo componente; titolo della
  card esplicitato in "Trend di spesa — costo mensile normalizzato", perché la
  metrica non è più la spesa realmente sostenuta.
- **`docs/Gestione_Pagamenti_e_Rinnovi.md`**, **`docs/Interfaccia_Grafica_Dashboard.md`**,
  **`docs/Index.md`** — aggiornate le macro-aree: la metrica è un concetto che
  cambia, quindi va riflessa (Parte III).

## File eliminati

- **`components/dashboard/spending-trend-chart.tsx`** — sostituito. Lasciarlo
  accanto al nuovo avrebbe prodotto due grafici e due fonti di verità.

## Nodo fantasma aperto

`[[Storico Cessazioni Abbonamenti]]`: `Subscription` conserva solo `createdAt` e
la cancellazione rimuove il record, quindi la serie storica ricostruibile è non
decrescente. Mostra la crescita della spesa ricorrente, non le disdette passate.
Serve una cancellazione logica sullo schema.

## Verifica

- `pnpm exec vitest run` — **exit 0**, 20 test su 3 file (12 preesistenti + 8 nuovi)
- `pnpm exec tsc --noEmit` — **exit 0**
- `pnpm exec next lint` — **exit 0**, nessun warning
- `pnpm exec next build` — **exit 0**, 17/17 route

⚠️ **Costo in bundle**: la rotta `/` passa da 1,18 kB a 109 kB, e il First Load JS
da 88,4 kB a 196 kB. Sono ~108 kB di Recharts su una PWA pensata per il mobile.
Il grafico CSS precedente costava zero. Il trade-off va deciso consapevolmente:
si può recuperare buona parte con un import dinamico del componente.

## Stato

Nessun commit effettuato: in attesa di OK esplicito, come richiesto.
