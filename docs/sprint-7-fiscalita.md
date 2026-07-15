# Sprint 7 — Fiscalità & Ottimizzazione · Documento di Design

> Stato: **Fase 1 (Database) approvata** dal team. Documento di tracciamento delle
> scelte architetturali. La UI, le Server Actions, i tipi e l'OCR sono **fuori scope**
> di questa fase (sprint/step successivi).

## 1. Obiettivo

Espandere lo schema del database per supportare logiche fiscali avanzate sugli
abbonamenti: separazione spese personali/aziendali, deducibilità del costo,
detraibilità dell'IVA, categorie di spesa e tipologia del documento fiscale.

## 2. Principio architetturale chiave

**La deducibilità del COSTO e la detraibilità dell'IVA sono due grandezze distinte**
(normativa italiana). Esempio (auto aziendale): costo deducibile al 20%, IVA
detraibile al 40%. Per questo lo schema le modella con **due percentuali separate**
(`costDeductiblePct` e `vatDeductiblePct`), mai un unico campo.

Vincoli di progetto rispettati:
- **Regola 1** — tutti gli importi/percentuali monetari sono `Decimal`, mai float.
- **Regola 4** — i campi fiscali sono **inline** su `Subscription` per preservare il
  fetch a `SELECT` singola usato dal Monthly Burn Rate (nessuna join obbligatoria).

## 3. Decisioni approvate dal team

| # | Decisione | Esito |
|---|---|---|
| 1 | `amount` lordo vs netto | **Mantenuto `amount` + flag `amountIsGross`**; imponibile calcolato a runtime |
| 2 | Categoria: tabella vs enum | **Tabella `ExpenseCategory`** (porta i default fiscali, estendibile) |
| 3 | Campi fiscali inline vs relazione 1:1 | **Inline su `Subscription`** (preserva il single-SELECT del Burn Rate) |
| 4 | Regimi IVA esteri / multi-country | **Fuori scope** — approccio "Italia-first" |
| 5 | Snapshot fiscale su `PaymentLog` | **Fuori scope** (sprint futuro) per non complicare la migrazione |

## 4. Modifiche allo schema (Fase 1)

### 4.1 Nuovi enum

| Enum | Valori | Scopo |
|---|---|---|
| `ExpenseNature` | `PERSONAL`, `BUSINESS`, `MIXED` | Separazione personale/aziendale |
| `FiscalDocumentType` | `NONE`, `RECEIPT`, `INVOICE` | Tipologia di fatturazione |
| `VatRegime` | `STANDARD`, `REDUCED`, `EXEMPT`, `REVERSE_CHARGE`, `NON_TAXABLE` | Casi IVA oltre la sola aliquota |

### 4.2 Nuova tabella `ExpenseCategory`

Categoria con default fiscali. `userId` null = categoria di sistema (seed condiviso);
valorizzato = categoria personalizzata dall'utente.

| Campo | Tipo | Default |
|---|---|---|
| `id` | `String @id @default(cuid())` | — |
| `userId` | `String?` | `null` |
| `name` | `String` | — |
| `nature` | `ExpenseNature` | `BUSINESS` |
| `defaultCostDeductiblePct` | `Decimal(5,2)` | `100.00` |
| `defaultVatRate` | `Decimal(5,2)` | `22.00` |
| `defaultVatDeductiblePct` | `Decimal(5,2)` | `100.00` |
| `createdAt` | `DateTime` | `now()` |

Vincoli: `@@unique([userId, name])`, `@@index([userId])`.

### 4.3 Nuovi campi su `Subscription` (additivi, retro-compatibili)

Gli abbonamenti esistenti diventano `PERSONAL` e non deducibili → nessun backfill rischioso.

| Campo | Tipo | Default | Scopo |
|---|---|---|---|
| `expenseNature` | `ExpenseNature` | `PERSONAL` | personale/aziendale/misto |
| `categoryId` | `String?` | `null` | FK → `ExpenseCategory` (`onDelete: SetNull`) |
| `amountIsGross` | `Boolean` | `true` | `amount` è IVA inclusa (lordo)? |
| `vatRate` | `Decimal(5,2)` | `22.00` | aliquota IVA % |
| `vatRegime` | `VatRegime?` | `STANDARD` | esente / reverse charge / non imponibile |
| `costDeductiblePct` | `Decimal(5,2)` | `0.00` | % deducibilità del **costo** |
| `vatDeductiblePct` | `Decimal(5,2)` | `0.00` | % detraibilità dell'**IVA** |
| `documentType` | `FiscalDocumentType` | `NONE` | scontrino / fattura |
| `supplierVatId` | `String?` | `null` | Partita IVA fornitore (fatture B2B) |

Indici aggiuntivi: `@@index([categoryId])`, `@@index([userId, expenseNature])`.

I valori derivati (imponibile, quota IVA, costo deducibile, IVA detraibile) **NON**
sono persistiti: verranno calcolati a runtime in `Decimal` in un futuro `lib/fiscal.ts`.

## 5. SQL della migrazione (anteprima generata offline)

```sql
-- CreateEnum
CREATE TYPE "ExpenseNature" AS ENUM ('PERSONAL', 'BUSINESS', 'MIXED');
CREATE TYPE "FiscalDocumentType" AS ENUM ('NONE', 'RECEIPT', 'INVOICE');
CREATE TYPE "VatRegime" AS ENUM ('STANDARD', 'REDUCED', 'EXEMPT', 'REVERSE_CHARGE', 'NON_TAXABLE');

-- AlterTable (tutte le colonne con DEFAULT → nessun backfill)
ALTER TABLE "Subscription"
  ADD COLUMN "amountIsGross"     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "categoryId"        TEXT,
  ADD COLUMN "costDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "documentType"      "FiscalDocumentType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "expenseNature"     "ExpenseNature" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "supplierVatId"     TEXT,
  ADD COLUMN "vatDeductiblePct"  DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vatRate"           DECIMAL(5,2) NOT NULL DEFAULT 22,
  ADD COLUMN "vatRegime"         "VatRegime" DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "nature" "ExpenseNature" NOT NULL DEFAULT 'BUSINESS',
  "defaultCostDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 22,
  "defaultVatDeductiblePct" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- Indici + Foreign key
CREATE INDEX "ExpenseCategory_userId_idx" ON "ExpenseCategory"("userId");
CREATE UNIQUE INDEX "ExpenseCategory_userId_name_key" ON "ExpenseCategory"("userId", "name");
CREATE INDEX "Subscription_categoryId_idx" ON "Subscription"("categoryId");
CREATE INDEX "Subscription_userId_expenseNature_idx" ON "Subscription"("userId", "expenseNature");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

> Migrazione **puramente additiva**: nessun `DROP`, nessuna colonna rimossa → zero
> perdita di dati sugli abbonamenti esistenti.

## 6. Impatti sui layer esistenti (fasi successive — NON in questa fase)

| File / layer | Impatto previsto |
|---|---|
| `actions/subscription.actions.ts` | Estendere `SubscriptionInput` + `create`/`update` |
| `types/index.ts` | Estendere `SubscriptionDTO` + `toSubscriptionDTO` (Decimal→string) |
| `lib/data/subscriptions.ts` | Eventuale `include: { category }` — attenzione al single-SELECT |
| `actions/burn-rate.actions.ts` | Nuova metrica "burn netto/deducibile" (additiva) |
| `actions/vision.actions.ts` (OCR) | Estendere `RECEIPT_SCHEMA` + prompt per IVA/categoria |
| **nuovo** `lib/fiscal.ts` | Calcoli imponibile/IVA/deducibile in `Decimal` + test |

## 7. Nota operativa sulla migrazione in produzione

Dopo la scelta del `buildCommand` su Vercel (`prisma generate && next build`),
**`prisma migrate deploy` non gira più in automatico sul deploy**. La migrazione
fiscale andrà quindi applicata **manualmente** al DB di produzione (Supabase, via
`DIRECT_URL`) in modo controllato, separatamente dal deploy del codice.
