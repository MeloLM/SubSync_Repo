# 2026-08-21 — Code-splitting del grafico con next/dynamic

Recharts era finito nel bundle iniziale della dashboard. Spostato in un chunk
caricato su richiesta.

## Problema

Il build precedente al dynamic import riportava per la rotta `/`:

```
ƒ /    109 kB    196 kB (First Load JS)
```

Circa 108 kB di Recharts pagati a ogni primo caricamento della dashboard, su una
PWA pensata per il mobile.

## File creato

- **`components/dashboard/spending-chart-loader.tsx`** — wrapper client che
  importa il grafico con `next/dynamic` e `ssr: false`, con un placeholder che
  replica l'altezza esatta del grafico (`h-48 sm:h-56` più il footer) per non
  produrre layout shift.

  Il wrapper non è un vezzo architetturale: `app/(dashboard)/page.tsx` è un
  Server Component, e in Next 14 `ssr: false` non è consentito lì. Serve un
  confine client esplicito, e questo file contiene solo quello.

## File modificati

- **`app/(dashboard)/page.tsx`** — usa `SpendingChartLoader` al posto di
  `SpendingChart`.
- **`docs/Interfaccia_Grafica_Dashboard.md`** — documentata la ragione del
  confine di code-splitting e del placeholder.

## Risultato

| Metrica | Prima di Recharts | Con Recharts statico | Con dynamic import |
| ------- | ----------------- | -------------------- | ------------------ |
| Rotta `/` | 1,18 kB | 109 kB | **1,35 kB** |
| First Load JS | 88,4 kB | 196 kB | **88,7 kB** |

Il costo residuo del grafico sul caricamento iniziale è di 0,3 kB: Recharts vive
ora in un chunk separato, richiesto solo dopo l'idratazione.

Contropartita accettata: con `ssr: false` il grafico non è più server-renderizzato.
Al primo paint la card mostra lo skeleton, poi il grafico lo sostituisce senza
spostare nulla intorno.

## Verifica

- `pnpm exec vitest run` — **exit 0**, 20 test su 3 file
- `pnpm exec tsc --noEmit` — **exit 0**
- `pnpm exec next lint` — **exit 0**, nessun warning
- `pnpm exec next build` — **exit 0**, 17/17 route

## Commit

`feat(dashboard): trend spesa 6 mesi con Recharts (dynamic) e normalizzazione
burn rate (Sprint 7)`, seguito da push su `origin/main`.

## Nota sul modello dati

Il nodo `[[Storico Cessazioni Abbonamenti]]` resta aperto su Obsidian per scelta
del team: la soft-delete su `Subscription` è rimandata al prossimo sprint. Fino ad
allora la serie storica del trend resta non decrescente.
