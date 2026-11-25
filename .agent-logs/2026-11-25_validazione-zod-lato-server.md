# Validazione server-side con zod per abbonamenti e split — 2026-11-25

## Richiesta
Intervento 2 dello Sprint 8: chiudere i casi in cui l'input del client arrivava al
database senza controlli (valuta malformata che fa lanciare `RangeError` a
`formatMoney`, `nextRenewalDate` nel passato remoto che fa creare al cron un
`PaymentLog` per ogni ciclo arretrato, importi ≤ 0, nome vuoto o lunghissimo,
categoria di un altro utente, percentuali fiscali fuori da 0–100). Schema Prisma e
database non toccati.

## File creati o modificati
- `package.json`, `pnpm-lock.yaml`: `pnpm add zod` (4.6.7). Zod non ha install-script:
  `allowBuilds` in `pnpm-workspace.yaml` non va toccato.
- `lib/validation/common.ts` (nuovo): `parseInput` (primo errore in `{ ok: false, error }`),
  `idSchema`, `decimalString` (decimali come stringhe, mai `number`, Regola 1),
  `percentageSchema`, `renewalDateSchema` (formato, giorno reale, non prima di oggi UTC).
- `lib/validation/subscription.ts` (nuovo): schemi di creazione e modifica, enum derivati
  dal client Prisma generato, id abbonamento.
- `lib/validation/split.ts` (nuovo): email normalizzata, quota 0–100, invito, quota,
  azione su membro, risposta all'invito.
- `lib/validation/subscription.test.ts`, `lib/validation/split.test.ts` (nuovi): casi
  validi, limite e tutti i casi concreti della richiesta.
- `actions/subscription.actions.ts`: create, update, cancel e reactivate validano
  con gli schemi e scrivono solo l'output validato; controllo di appartenenza della
  categoria nell'action.
- `actions/split.actions.ts`: invito, quota, saldo, rimozione e risposta all'invito
  validati; rimosso `parseWeight`, sostituito dallo schema.
- `docs/Motore_Regole_NextJS.md`, `docs/Gestione_Pagamenti_e_Rinnovi.md`,
  `docs/Condivisione_Spese_e_Gruppi.md`, `docs/Calcolo_IVA_e_Fisco.md`: regole di
  validazione nelle macro-aree.
- `TODO.md`: nuova sezione di backlog "Validazione lato server".

## Scelte e deviazioni dal brief
- **Modifica e data di rinnovo**: il form di modifica rimanda sempre la data attuale.
  Il controllo "non prima di oggi" non si applica se la data coincide con quella
  salvata (l'action legge il record e la passa allo schema); una data diversa deve
  essere di oggi o futura. Senza questa eccezione non si potrebbe rinominare un
  abbonamento scaduto o disdetto.
- **Categoria**: sono ammesse anche le categorie di sistema (`userId` null), non solo
  quelle dell'utente: non appartengono a un altro utente e sono condivise per
  progetto. Una categoria altrui è rifiutata.
- Estensioni non elencate nel brief: enum fiscali validati, `supplierVatId` limitato
  a 32 caratteri (vuoto = null), id limitati a 64 caratteri, email a 254.
- Le percentuali ammettono fino a 4 decimali (il DB arrotonda a 2), per non rifiutare
  valori OCR con decimali superflui.

## Verifica
- `npx tsc --noEmit`: nessun errore.
- `npx next lint`: nessun warning o errore.
- `npx vitest run`: 7 file, 231 test passati (73 preesistenti + 158 nuovi).
- `npx next build`: compilato, 16/16 pagine.
- `prisma validate` con stringhe di connessione fittizie: schema valido.
- `pnpm build` NON eseguito, per deroga esplicita dell'utente alla Parte IV (include
  `prisma migrate deploy`).
- Le Server Action non sono testate in isolamento (dipendono dai cookie di sessione):
  il controllo di appartenenza della categoria e il confronto con la data salvata
  nell'action non hanno test automatici; sono coperti i soli schemi.
- Verifiche eseguite prima degli ultimi aggiornamenti di docs e TODO, che non
  toccano codice.

## Note di configurazione
Nessuna.

## Osservazioni emerse
- La validazione protegge l'ingresso, non ripulisce i dati già salvati.
- Il cron dei rinnovi recupera gli arretrati con un tetto tecnico di 600 iterazioni
  per abbonamento: un salvagente, non una politica.
- `docs/Database_Tabelle_e_Modelli_Prisma.md` elenca ancora tra i "Lavori aperti" la
  migrazione dell'ingestione email, ora committata: va aggiornato (fuori ambito qui).
- Lo scanner Gemini non valida ancora il proprio output con questi schemi.
