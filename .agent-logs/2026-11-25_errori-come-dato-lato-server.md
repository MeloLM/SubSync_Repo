# 2026-11-25 — Errori come dato: lato server (intervento 1 di 4)

## Contesto
In produzione Next.js oscura il messaggio delle eccezioni lanciate dalle Server
Action (vedi commento in `actions/vision.actions.ts`). `split.actions.ts` aveva 10
`throw new Error("...")` per errori attesi; `subscription.actions.ts` lasciava
propagare l'errore Prisma P2025 e l'errore di sessione. Questo log copre solo la parte
server: i componenti client li aggiorna IRIDE.

## File creati o modificati
- `types/index.ts`: aggiunto il tipo condiviso `ActionResult<T>` (unione
  `{ ok: true; data: T } | { ok: false; error: string }`).
- `lib/action-result.ts` (nuovo): `getSessionUser()` (utente o `null` invece di
  eccezione), `SESSION_EXPIRED_ERROR`, `isPrismaError(err, "P2025" | "P2002")`.
- `actions/subscription.actions.ts`: `createSubscription` e `updateSubscription` ->
  `ActionResult<SubscriptionDTO>`; `cancelSubscription` e `reactivateSubscription` ->
  `ActionResult<null>` (logica comune estratta in `setCanceledAt`). P2025 (record
  assente o altrui) diventa "Abbonamento non trovato o non autorizzato.".
- `actions/split.actions.ts`: `inviteMember`, `updateMemberShare`,
  `toggleMemberSettled`, `removeMember`, `respondToInvite` -> `ActionResult<null>`.
  Zero `throw` per errori attesi. `requireOwnedMember` sostituita da
  `resolveOwnedMember` (restituisce `ActionResult`). Nuovo `parseWeight`: una quota
  non numerica ora e' un errore di validazione (prima `money()` lanciava un
  DecimalError redatto). P2002 su `inviteMember` intercettato come "gia' invitata".
- `docs/Motore_Regole_NextJS.md` (nuova sezione "Errori come valore"),
  `docs/Gestione_Pagamenti_e_Rinnovi.md`, `docs/Condivisione_Spese_e_Gruppi.md`.

Non toccati: `actions/vision.actions.ts`, `actions/auth.actions.ts`, componenti
client, `schema.prisma`, database. Le letture (`listSubscriptions`, `getSubscription`,
`getSplitOverview`, `listPendingInvites`, ...) non cambiano.

## Esito della verifica
- `npx tsc --noEmit`: 0 errori.
- `npx next lint`: nessun warning ne' errore.
- `npx vitest run`: 5 file, 73/73 test passati.
- `pnpm build` e `next build` NON eseguiti: deroga dell'utente alla Parte IV
  (`pnpm build` include `prisma migrate deploy`); `next build` a fine intervento,
  dopo IRIDE. `prisma generate` non necessario: il client generato e' gia' presente.

## Note di configurazione
Nessuna.

## Osservazioni emerse
- `tsc` e' pulito perche' i componenti fanno `await action(...)` e scartano il valore
  di ritorno: nessun errore di tipo, ma fino all'aggiornamento di IRIDE un'azione
  fallita mostra comunque il toast di successo. Il commit 1 non va fatto senza i
  componenti.
- `createSubscription` e `updateSubscription` passano ancora `money(input.amount)` e
  `toUtcMidnight(...)` senza validare: un importo o una data malformati lanciano
  (errore redatto). Lo risolve l'intervento 2 (zod).
- `reactivateSubscription` non ha chiamanti (backlog gia' noto, TODO.md).
- Nel working tree restano file del task precedente (migrazione email_ingestion,
  log 23/11 e 25/11 migrazione, `.gitignore`, `.gitattributes`, `TODO.md`), non mescolati.
