# 2026-11-25 — Migrazione dello schema Email Ingestion

## Contesto
Il DB Supabase di produzione risulta allineato alla cronologia migrazioni
(`prisma migrate status`: up to date, 4 migrazioni) ma non allo `schema.prisma`:
il commit 6e34c13 (Sprint 8) ha aggiunto i modelli dell'Email Ingestion senza
generare la relativa migrazione. Il client generato include i nuovi campi, quindi
le query che li toccano falliscono con P2022 sul DB reale.

## File creati o modificati
- `prisma/migrations/20261125100000_email_ingestion_schema/migration.sql` (nuovo):
  output di `prisma migrate diff --from-migrations prisma/migrations
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url <subsync_shadow>
  --script`. 99 righe, solo additivo: 5 `CREATE TYPE`, 2 `CREATE TABLE`
  (`InboundEmail`, `PaymentProposal`), 2 `ALTER TABLE ... ADD COLUMN`
  (`PaymentLog.source` NOT NULL DEFAULT 'CRON'; `User.inboundToken`,
  `User.inboundTokenRotatedAt` nullable), 7 indici (4 unique), 5 foreign key.
  Nessun DROP, TRUNCATE, RENAME o ALTER distruttivo.
- Nessun altro file di codice toccato. Rimasti nel working tree i file del passo 0
  (`.gitattributes`, `.gitignore`, `TODO.md`, log 2026-11-23), non ancora committati.

## Esito della verifica
- Shadow DB: database `subsync_shadow` creato nel Postgres Docker locale
  (`subsync_db` non toccato). Dopo il salvataggio, `migrate diff --from-migrations
  --to-schema-datamodel --exit-code` restituisce «No difference detected»: la
  cronologia, nuova migrazione inclusa, riproduce esattamente lo schema.
- Confronto in sola lettura `--from-url <Supabase> --to-schema-datamodel`: lo SQL
  prodotto è IDENTICO a quello della migrazione. Nessuna scrittura su Supabase.
- Cron rinnovi: provato con un DB `subsync_probe` (le 4 migrazioni vecchie) e il
  client attuale. `paymentLog.createMany` emette
  `INSERT INTO "PaymentLog" ("subscriptionId","paidAt","amount","source","id")`,
  cioè inserisce `source` esplicitamente, e fallisce con P2022. Il cron rinnovi è
  quindi rotto oggi in produzione.
- `tsc --noEmit` OK, `vitest run` 73/73 (5 file), `eslint .` OK. `pnpm build` non
  eseguito: include `prisma migrate deploy` e non va lanciato contro il DB reale.

## Note di configurazione
- Per applicare in produzione serve un passo manuale e consapevole (vercel.json
  esclude `migrate deploy`): vedi Report. Credenziali iniettate da `.env.local`
  nella singola invocazione, mai stampate né scritte su disco.
- Nel Postgres Docker locale restano due database di servizio, `subsync_shadow` e
  `subsync_probe`, eliminabili a mano quando non servono più.

## Osservazioni emerse
- Funzioni rotte in produzione oggi (P2022): `user.upsert` in
  `actions/subscription.actions.ts:97`, `actions/split.actions.ts:271`,
  `actions/dev.actions.ts:153`; `user.findUnique` in
  `actions/split.actions.ts:151`; `paymentLog.findMany` con include in
  `lib/data/payments.ts:10`; `paymentLog.createMany` in
  `app/api/cron/renewals/route.ts:52`.
- `pnpm exec prisma ...` con pnpm 11 stampa due righe di rumore su stdout
  («Already up to date», «Done in ...»): redirigendo l'output in un file vanno
  tolte, altrimenti la migrazione non è SQL valido.
- Non generare l'output direttamente dentro `prisma/migrations/`: Prisma lo legge
  come migrazione durante il diff e fallisce con P3006.
