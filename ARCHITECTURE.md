# ARCHITECTURE — SubSync

Questo documento descrive la **struttura tecnica** del progetto: organizzazione
delle cartelle, mappa della documentazione e schema relazionale.

Non contiene regole. Le regole operative, le direttive di comportamento e le
convenzioni di nomenclatura vivono in un unico documento normativo:
**`AI_law_subsync.md`** nella root del progetto.

---

## Struttura delle cartelle (App Router)

```
subsync/
├── app/
│   ├── (auth)/                          # Route group pubblico (non autenticato)
│   │   └── login/page.tsx               # Pagina di login
│   ├── (dashboard)/                     # Route group autenticato / area applicativa
│   │   ├── layout.tsx                   # Layout dashboard (sidebar, header KPI)
│   │   ├── loading.tsx                  # Skeleton di caricamento dashboard
│   │   ├── error.tsx                    # Error boundary dell'area dashboard
│   │   ├── page.tsx                     # Dashboard principale (KPI + Burn Rate)
│   │   ├── profile/page.tsx             # Profilo utente
│   │   ├── subscriptions/
│   │   │   ├── page.tsx                 # Lista abbonamenti
│   │   │   ├── loading.tsx              # Skeleton lista
│   │   │   ├── new/page.tsx             # Form nuovo abbonamento
│   │   │   ├── [id]/edit/page.tsx       # Form modifica abbonamento
│   │   │   └── [id]/split/page.tsx      # Split-Billing: gestione condivisione (proprietario)
│   │   ├── shared/page.tsx              # Split-Billing: inviti + condivisi con me (invitato)
│   │   └── payments/
│   │       ├── page.tsx                 # Storico pagamenti (PaymentLog)
│   │       └── loading.tsx              # Skeleton storico
│   ├── api/
│   │   └── cron/renewals/route.ts       # Endpoint Cron rinnovi (Bearer CRON_SECRET)
│   ├── auth/
│   │   └── callback/route.ts            # Callback OAuth/email (exchangeCodeForSession)
│   ├── layout.tsx                       # Root layout (Toaster, PWA, viewport)
│   ├── global-error.tsx                 # Error boundary radice
│   ├── manifest.ts                      # Web App Manifest (PWA)
│   └── globals.css                      # Stili globali Tailwind
│
├── actions/                            # Server Actions ("use server")
│   ├── auth.actions.ts                  # signIn / signUp / signOut (Supabase)
│   ├── subscription.actions.ts          # CRUD Abbonamenti (mutazioni)
│   ├── burn-rate.actions.ts             # Calcolo Monthly Burn Rate (server-only)
│   ├── payment.actions.ts               # Lettura storico pagamenti (DTO)
│   ├── split.actions.ts                 # Split-Billing: inviti, quote, settlement (DTO)
│   └── vision.actions.ts                # Server Action per estrazione dati via Gemini
│
├── components/                         # Componenti React riutilizzabili (UI)
│   ├── ui/                              # Primitive (Skeleton, EmptyState)
│   ├── forms/                           # Form applicativi
│   │   ├── login-form.tsx               # Form login/signup
│   │   ├── subscription-form.tsx        # Form abbonamento (create/edit, auto-fill)
│   │   └── image-scanner.tsx            # Dropzone per upload ricevute
│   ├── subscriptions/                   # Componenti di dominio abbonamenti
│   ├── split/                           # Split-Billing (invito, riga membro, risposta invito)
│   └── pwa/                             # Install prompt + registrazione service worker
│
├── lib/                                # Utility e client condivisi
│   ├── data/                            # Data-access layer memoizzato (React.cache)
│   │   ├── subscriptions.ts             # Fetcher abbonamenti (1 SELECT per render)
│   │   ├── payments.ts                  # Fetcher pagamenti
│   │   └── members.ts                   # Fetcher membri/inviti Split-Billing
│   ├── supabase/
│   │   ├── server.ts                    # Client Supabase server (cookie SSR)
│   │   └── client.ts                    # Client Supabase browser
│   ├── auth.ts                          # getCurrentUser / getCurrentUserId (cache)
│   ├── prisma.ts                        # Singleton Prisma Client
│   ├── money.ts                         # Helper Decimal (money, splitByWeights, formatMoney)
│   ├── split.ts                         # Logica ripartizione quote Split-Billing (Decimal)
│   └── date.ts                          # Helper date UTC + advanceRenewalDate
│
├── types/
│   └── index.ts                         # DTO + serializzatori (Decimal/Date → string)
│
├── prisma/
│   ├── schema.prisma                    # Schema del database (datasource + modelli)
│   └── migrations/                      # Migrazioni generate da Prisma
│
├── public/                             # Asset statici + PWA (icone, sw.js, offline.html)
│
├── middleware.ts                        # Protezione rotte (redirect a /login se non auth)
├── vercel.json                          # Schedulazione Vercel Cron (rinnovi)
├── docker-compose.yml                   # Servizio PostgreSQL (sviluppo locale)
├── next.config.mjs
├── tailwind.config.ts                   # Design system "Graphite & Neon"
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── README.md
├── TODO.md
└── ARCHITECTURE.md
```

---

## Mappa Obsidian (macro-aree)

La documentazione di dettaglio vive in `docs/`, organizzata per **area logica** e non
per file di codice. Il nodo centrale è [[Index]], che raccoglie tutte le aree e i
lavori ancora da fare.

### Fondamenta
[[Motore_Regole_NextJS]] · [[Auth_Utenti_e_Sessioni_Supabase]] · [[Database_Tabelle_e_Modelli_Prisma]]

### Domini applicativi
[[Gestione_Pagamenti_e_Rinnovi]] · [[Condivisione_Spese_e_Gruppi]] · [[Calcolo_IVA_e_Fisco]] · [[Lettura_Scontrini_OCR_Gemini]]

### In progettazione
[[Soft_Delete_Abbonamenti]] · [[Email_Ingestion_e_Matching]]

### Interfaccia e distribuzione
[[Interfaccia_Grafica_Dashboard]] · [[App_Mobile_e_Offline_PWA]]

### Nodi fantasma
Feature pianificate e non ancora esistenti, che nel grafo appaiono come cerchi vuoti.
L'elenco completo con il contesto è in [[Index]]; il dettaglio operativo in [[TODO]].

Le regole di manutenzione della documentazione (macro-aree, divieto di note per
singolo componente, ciclo di vita dei nodi fantasma) sono in `AI_law_subsync.md`.

---

## Schema relazionale

```
User (1) ──< (N) Subscription (1) ──< (N) PaymentLog
                      │
                      └──< (N) SubscriptionMember >── (N) User
User (1) ──< (N) ExpenseCategory ──< (N) Subscription
```

- **User (1) → (N) Subscription**: un utente possiede molti abbonamenti.
- **Subscription (1) → (N) PaymentLog**: ogni abbonamento ha uno storico pagamenti.
- **Subscription (1) → (N) SubscriptionMember**: Split-Billing, i partecipanti con
  cui la spesa è condivisa. Ogni membro può puntare a uno `User` reale, ma
  l'invito nasce sull'email e può precedere l'account.
- **ExpenseCategory (1) → (N) Subscription**: categorie di spesa con default
  fiscali, opzionali sull'abbonamento.

### Entità

#### `User`
| Campo       | Tipo     | Note                                   |
| ----------- | -------- | -------------------------------------- |
| `id`        | String   | PK (cuid), allineato all'id Supabase   |
| `email`     | String   | univoco                                |
| `createdAt` | DateTime |                                        |

#### `Subscription`
| Campo               | Tipo        | Note                                       |
| ------------------- | ----------- | ------------------------------------------ |
| `id`                | String      | PK                                         |
| `userId`            | String      | FK → User (`onDelete: Cascade`)            |
| `name`              | String      | Nome servizio (es. "Netflix")              |
| `amount`            | **Decimal** | `Decimal(12,2)` — Regola 1, mai float      |
| `currency`          | String      | es. "EUR"                                  |
| `billingCycle`      | Enum        | `MONTHLY` \| `YEARLY`                      |
| `nextRenewalDate`   | DateTime    | Forzata a 00:00:00 UTC (Regola 2)          |
| `createdAt`         | DateTime    |                                            |
| `categoryId`        | String?     | FK → ExpenseCategory (opzionale)           |
| `expenseNature`     | Enum        | `PERSONAL` \| `BUSINESS` \| `MIXED`        |
| `amountIsGross`     | Boolean     | `amount` è IVA inclusa?                    |
| `vatRate`           | **Decimal** | `Decimal(5,2)` — aliquota IVA %            |
| `costDeductiblePct` | **Decimal** | `Decimal(5,2)` — deducibilità del costo    |
| `vatDeductiblePct`  | **Decimal** | `Decimal(5,2)` — detraibilità dell'IVA     |
| `documentType`      | Enum        | `NONE` \| fattura \| ricevuta              |

> ⚠️ Manca una data di cessazione: la disdetta oggi cancella il record e con esso
> lo storico. È il vincolo che il [[Soft_Delete_Abbonamenti]] va a rimuovere.

#### `SubscriptionMember` (Split-Billing)
| Campo            | Tipo        | Note                                            |
| ---------------- | ----------- | ----------------------------------------------- |
| `id`             | String      | PK                                              |
| `subscriptionId` | String      | FK → Subscription (`onDelete: Cascade`)         |
| `userId`         | String?     | FK → User — nullo finché l'invitato non esiste   |
| `email`          | String      | destinatario dell'invito, chiave del matching   |
| `status`         | Enum        | `PENDING` \| `ACCEPTED` \| `DECLINED`           |
| `shareWeight`    | **Decimal** | `Decimal(12,4)` — peso della quota              |
| `settled`        | Boolean     | il membro ha saldato la sua parte               |
| `createdAt`      | DateTime    |                                                 |

> Il proprietario **non** è una riga di questa tabella: è implicito, con peso 1,
> e viene aggiunto al calcolo delle quote. Dettagli in
> [[Condivisione_Spese_e_Gruppi]].

#### `PaymentLog`
| Campo            | Tipo        | Note                                    |
| ---------------- | ----------- | --------------------------------------- |
| `id`             | String      | PK                                      |
| `subscriptionId` | String      | FK → Subscription (`onDelete: Cascade`) |
| `amount`         | **Decimal** | `Decimal(12,2)` — Regola 1              |
| `paidAt`         | DateTime    | Data pagamento (UTC)                    |

#### `ExpenseCategory`
| Campo                      | Tipo        | Note                                  |
| -------------------------- | ----------- | ------------------------------------- |
| `id`                       | String      | PK                                    |
| `userId`                   | String      | FK → User                             |
| `name`                     | String      | es. "Software aziendale"              |
| `nature`                   | Enum        | `ExpenseNature` predefinita           |
| `defaultCostDeductiblePct` | **Decimal** | deducibilità suggerita                |
| `defaultVatRate`           | **Decimal** | aliquota IVA suggerita                |
| `defaultVatDeductiblePct`  | **Decimal** | detraibilità IVA suggerita            |

> Modellata ma non ancora operativa: nessuna Server Action né UI la usano.
> Vedi [[Expense Category Actions]].

