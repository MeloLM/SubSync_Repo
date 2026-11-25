# 2026-11-25 — Errori come dato: lato client (intervento 1 di 4)

## Contesto
Seconda metà dell'intervento 1. Le Server Action di abbonamenti e split restituiscono
`ActionResult<T>` (vedi `2026-11-25_errori-come-dato-lato-server.md`), ma i cinque
componenti chiamanti scartavano il valore di ritorno: un'azione fallita mostrava il
toast di successo, faceva il refresh e la navigazione. Qui i chiamanti leggono l'esito.
Stesso pattern di `components/forms/image-scanner.tsx` e `components/dev/seed-button.tsx`.

## File modificati
- `components/forms/subscription-form.tsx`: `createSubscription`/`updateSubscription`
  lette in `res`; con `!res.ok` toast di errore con `res.error` e uscita prima di toast
  di successo e `router.push`/`router.refresh`. Il `catch` resta per i guasti inattesi,
  con messaggio generico in italiano.
- `components/subscriptions/cancel-subscription-button.tsx`: stessa lettura su
  `cancelSubscription`; su errore il dialog resta aperto (come già nel vecchio `catch`),
  senza `setOpen(false)` né refresh.
- `components/split/invite-member-form.tsx`: lettura di `inviteMember`; su errore niente
  toast di successo, niente `reset()` del form (l'email digitata resta), niente refresh.
- `components/split/invite-response-buttons.tsx`: lettura di `respondToInvite`.
- `components/split/member-row.tsx`: il wrapper `run` ora accetta un'azione che restituisce
  `Promise<ActionResult<null>>`, più opzioni `successTitle` e `onFail`. Il toast di
  successo (prima dentro la closure di ogni azione) passa da `run` e parte solo con
  `ok: true`. In caso di errore, per `updateMemberShare` il campo quota torna al valore
  salvato (`onFail: setWeight(member.shareWeight)`): senza, il valore rifiutato
  resterebbe nel campo come se fosse stato salvato.

Stati di caricamento: tutti usano `useTransition`, che chiude `isPending` anche con
`return` anticipato dentro la callback: nessun pulsante resta bloccato dopo un errore.

Non toccati: `schema.prisma`, database, action, `actions/vision.actions.ts`,
`actions/auth.actions.ts`. `reactivateSubscription` non ha chiamanti.

## Esito della verifica
- `npx tsc --noEmit`: 0 errori.
- `npx next lint`: nessun warning né errore.
- `npx vitest run`: 5 file, 73/73 test passati.
- `npx next build`: compilazione, lint, tipi e 16 pagine statiche completati senza errori.
- `pnpm build` NON eseguito: deroga dell'utente alla Parte IV (include `prisma migrate deploy`).
- Nessun collaudo manuale nel browser né test dei componenti: non esistono test per i
  componenti client e le Server Action richiedono una sessione. Il comportamento in caso
  di errore è verificato dal type-check (l'unione discriminata obbliga a leggere `ok`
  per accedere a `data`/`error`) e dalla lettura del codice, non eseguito.

## Note di configurazione
Nessuna.

## Osservazioni emerse
- Documentazione: `docs/Motore_Regole_NextJS.md` e `docs/Interfaccia_Grafica_Dashboard.md`
  descrivevano già il comportamento corretto lato client ("i componenti leggono `ok`",
  "errori come valore"). Nessuna macro-area aggiornata.
- Il messaggio generico del `catch` è duplicato in cinque file. Non estratto in un
  helper per restare nell'ambito; eventuale unificazione da valutare.
- `subscription-form.tsx` ha terminatori CRLF: Git avverte che li converte in LF.
  `.gitattributes` (task precedente) è non committato.
