# 2026-08-21 — Soft-delete: logica applicativa, test e chiusura

Completa lo Sprint 8 obiettivo 1. Il campo `canceledAt` era già sul database dal
blocco precedente; qui entra nel codice.

## Premessa: cosa non era stato fatto

Il task chiedeva di verificare e committare una logica descritta come già
aggiornata. **Non lo era.** Il blocco precedente si era fermato a schema,
migrazione e documentazione, chiudendo esplicitamente in attesa di fetcher e
logica. Verificare e committare in quello stato avrebbe prodotto un commit che
annunciava `implementato soft-delete` contenendo solo un `ALTER TABLE`. La logica
è stata quindi scritta ora, prima della verifica.

## File creati

- **`lib/subscription-status.ts`** — unico punto del filtro, come deciso dal team:
  `isActive`, `onlyActive`, `wasActiveInPeriod`. Helper puro, disaccoppiato dal
  model Prisma tramite una forma minima (`{ canceledAt: Date | null }`).
- **`lib/subscription-status.test.ts`** — 10 test, con attenzione agli estremi:
  cessazione esattamente all'inizio del periodo (inclusa) e creazione esattamente
  alla fine (esclusa).

## File modificati

- **`lib/spending-trend.ts`** — `TrendSubscriptionInput` accetta `canceledAt`; la
  condizione di appartenenza al mese passa da `createdAt < inizio(M+1)` a
  `wasActiveInPeriod`. Docblock riscritto per dire a chiare lettere che questo è
  l'**unico** consumatore che riceve anche i cessati, e cosa succede se qualcuno
  gli passa una lista già filtrata: la serie tornerebbe non decrescente, cioè al
  bug che il soft-delete doveva risolvere.
- **`lib/spending-trend.test.ts`** — factory esteso con `canceledAt`, più 5 test
  sul nuovo comportamento, incluso quello che verifica che **la serie scenda**.
- **`actions/subscription.actions.ts`** — `listSubscriptions` filtra gli attivi;
  `deleteSubscription` sostituita da `cancelSubscription` (valorizza `canceledAt`
  a mezzanotte UTC, Regola 2) e da `reactivateSubscription`.
- **`actions/burn-rate.actions.ts`** — filtra gli attivi: il Burn Rate è il costo
  corrente, un abbonamento disdetto non pesa più. Ne consegue che anche
  `subscriptionCount` conta solo gli attivi.
- **`actions/spending-trend.actions.ts`** — nessun filtro, con commento esplicito
  sul perché è deliberato.
- **`actions/split.actions.ts`** — `inviteMember` rifiuta un abbonamento cessato
  con messaggio dedicato.
- **`app/api/cron/renewals/route.ts`** — `canceledAt: null` nella `where`: un
  abbonamento disdetto non si rinnova e non genera pagamenti. Qui il filtro è sul
  database e non in memoria, perché è una query diretta e non passa dal fetcher
  memoizzato.
- **`types/index.ts`** — `canceledAt` nel DTO e nel mapper.
- **`components/subscriptions/delete-subscription-button.tsx`** → rinominato
  **`cancel-subscription-button.tsx`**, export `CancelSubscriptionButton`. Icona
  `PowerOff` al posto del cestino, dialog che spiega cosa succede davvero invece
  di parlare di rimozione definitiva.
- **`components/subscriptions/subscription-actions.tsx`** — import aggiornato.
- **`docs/Soft_Delete_Abbonamenti.md`**, **`TODO.md`** — stato allineato.

## Verifica

- `pnpm exec vitest run` — **exit 0**, **35 test su 4 file** (25 preesistenti + 10 nuovi)
- `pnpm exec tsc --noEmit` — **exit 0**
- `pnpm exec next lint` — **exit 0**, nessun warning
- `pnpm exec next build` — **exit 0**

## Osservazione emersa

⚠️ **La UI di riattivazione non esiste.** `reactivateSubscription` è scritta e
funzionante, ma nessuna schermata la invoca: un abbonamento disattivato sparisce
dalla lista e non c'è modo di riportarlo indietro dall'interfaccia. È una trappola
per l'utente, non un dettaglio estetico. Serve una vista dei cessati o un filtro
sulla lista esistente. Aggiunta come voce aperta in `TODO.md` e documentata in
`docs/Soft_Delete_Abbonamenti.md`.

Il dato non è perso — è nel database e continua ad alimentare il grafico — ma
l'utente non lo sa e non può agire.

## Stato

Commit `feat(subscriptions): implementato soft-delete con canceledAt per integrità
storico e fix README (Sprint 8)` e push su `origin/main`.
