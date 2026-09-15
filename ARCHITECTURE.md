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
│   ├── auth.actions.ts                  # signIn / signUp / signOut / nome visualizzato
│   ├── subscription.actions.ts          # CRUD Abbonamenti (mutazioni)
│   ├── burn-rate.actions.ts             # Calcolo Monthly Burn Rate (server-only)
│   ├── dashboard-charts.actions.ts      # Serie del grafico: competenza + cassa, tre finestre
│   ├── payment.actions.ts               # Lettura storico pagamenti (DTO)
│   ├── split.actions.ts                 # Split-Billing: inviti, quote, settlement (DTO)
│   ├── vision.actions.ts                # Server Action per estrazione dati via Gemini
│   └── dev.actions.ts                   # 🧪 Seed di dati finti — SOLO sviluppo, doppio guard
│
├── components/                         # Componenti React riutilizzabili (UI)
│   ├── ui/                              # Primitive (Skeleton, EmptyState)
│   ├── forms/                           # Form applicativi
│   │   ├── login-form.tsx               # Form login/signup
│   │   ├── subscription-form.tsx        # Form abbonamento (create/edit, auto-fill)
│   │   └── image-scanner.tsx            # Dropzone per upload ricevute
│   ├── subscriptions/                   # Componenti di dominio abbonamenti
│   ├── dashboard/                       # Shell, grafico, selettori, tooltip
│   ├── split/                           # Split-Billing (invito, riga membro, risposta invito)
│   ├── invite/                          # Schermata di invito con QR
│   ├── pwa/                             # Install prompt + registrazione service worker
│   └── dev/                             # 🧪 Strumenti di sviluppo — non entrano nel bundle di produzione
│
├── lib/                                # Utility e client condivisi
│   ├── data/                            # Data-access layer memoizzato (React.cache)
│   │   ├── subscriptions.ts             # Fetcher abbonamenti (1 SELECT per render)
│   │   ├── payments.ts                  # Fetcher pagamenti
│   │   └── members.ts                   # Fetcher membri/inviti Split-Billing
│   ├── supabase/
│   │   ├── server.ts                    # Client Supabase server (cookie SSR)
│   │   └── client.ts                    # Client Supabase browser
│   ├── auth.ts                          # getCurrentUser / getCurrentUserId / fullNameOf (cache)
│   ├── prisma.ts                        # Singleton Prisma Client
│   ├── money.ts                         # Helper Decimal (money, splitByWeights, formatMoney)
│   ├── split.ts                         # Logica ripartizione quote Split-Billing (Decimal)
│   ├── fiscal.ts                        # Motore IVA e deducibilità — ⚠️ non ancora collegato
│   ├── subscription-status.ts           # Soft-delete: unico punto del filtro sugli attivi
│   ├── spending-trend.ts                # Spesa per COMPETENZA (normalizzata, come il Burn Rate)
│   ├── cash-flow.ts                     # Spesa per CASSA (importi pieni) + proiezione rinnovi
│   └── date.ts                          # Date UTC, saturazione di fine mese, bucket mensili
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
[[Gestione_Pagamenti_e_Rinnovi]] · [[Condivisione_Spese_e_Gruppi]] · [[Calcolo_IVA_e_Fisco]] · [[Lettura_Scontrini_OCR_Gemini]] · [[Soft_Delete_Abbonamenti]]

### In progettazione
[[Email_Ingestion_e_Matching]] — modello chiuso e schema scritto, migrazione e webhook da fare

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
                      │                       ▲
                      └──< (N) SubscriptionMember >── (N) User
User (1) ──< (N) ExpenseCategory ──< (N) Subscription    │ (0..1)
                                                         │
User (1) ──< (N) InboundEmail (1) ─── (0..1) PaymentProposal
```

- **User (1) → (N) Subscription**: un utente possiede molti abbonamenti.
- **Subscription (1) → (N) PaymentLog**: ogni abbonamento ha uno storico pagamenti.
- **Subscription (1) → (N) SubscriptionMember**: Split-Billing, i partecipanti con
  cui la spesa è condivisa. Ogni membro può puntare a uno `User` reale, ma
  l'invito nasce sull'email e può precedere l'account.
- **ExpenseCategory (1) → (N) Subscription**: categorie di spesa con default
  fiscali, opzionali sull'abbonamento.
- **User (1) → (N) InboundEmail (1) → (0..1) PaymentProposal**: le ricevute
  ricevute via email e le proposte di pagamento che ne derivano. Una proposta
  approvata punta al `PaymentLog` che ha creato **o corretto**.

### Entità

#### `User`
| Campo       | Tipo     | Note                                   |
| ----------- | -------- | -------------------------------------- |
| `id`           | String    | PK (cuid), allineato all'id Supabase        |
| `email`        | String    | univoco                                     |
| `createdAt`    | DateTime  |                                             |
| `inboundToken` | String?   | Indirizzo di ricezione delle ricevute, `@unique` |

> Il nome visualizzato **non** è qui: vive nei `user_metadata` di Supabase, perché
> è un dato di identità dell'account e due copie non sarebbero mai entrambe
> autorevoli. Dettagli in [[Auth_Utenti_e_Sessioni_Supabase]].
>
> `inboundToken` è una credenziale al portatore e per questo è una colonna a sé,
> ruotabile (`inboundTokenRotatedAt`), e non lo `userId`: un identificatore non si
> può ruotare. Vedi [[Email_Ingestion_e_Matching]].

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
| `canceledAt`        | DateTime?   | **`null` = attivo.** Disdetta logica, 00:00:00 UTC |
| `categoryId`        | String?     | FK → ExpenseCategory (opzionale)           |
| `expenseNature`     | Enum        | `PERSONAL` \| `BUSINESS` \| `MIXED`        |
| `amountIsGross`     | Boolean     | `amount` è IVA inclusa?                    |
| `vatRate`           | **Decimal** | `Decimal(5,2)` — aliquota IVA %            |
| `costDeductiblePct` | **Decimal** | `Decimal(5,2)` — deducibilità del costo    |
| `vatDeductiblePct`  | **Decimal** | `Decimal(5,2)` — detraibilità dell'IVA     |
| `documentType`      | Enum        | `NONE` \| fattura \| ricevuta              |

> La disdetta **non cancella il record**: valorizza `canceledAt` e lo storico resta
> intatto, così il grafico può mostrare la spesa che scende invece di riscrivere il
> passato. Il filtro degli attivi è concentrato in un unico punto
> (`lib/subscription-status.ts`), perché dimenticarlo in un chiamante non produce
> un errore ma un numero sbagliato. Regole e conseguenze in
> [[Soft_Delete_Abbonamenti]].

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
| `source`         | Enum        | `CRON` \| `EMAIL` \| `MANUAL` — etichetta, mai un filtro |

> **Invariante: ogni riga è denaro che si è mosso.** Storico di cassa, Burn Rate e
> timeline leggono questa tabella senza filtrarla, perché non c'è niente da
> filtrare. Per questo un pagamento in attesa di conferma **non** vive qui ma in
> `PaymentProposal`: righe non confermate obbligherebbero ogni lettore ad
> aggiungere una condizione, e dimenticarla darebbe un totale gonfiato invece di
> un errore.

#### `InboundEmail` _(modellata, migrazione da eseguire)_
Registro dei messaggi ricevuti sull'indirizzo dedicato. È il meccanismo
dell'**idempotenza**: ogni messaggio viene rivendicato qui prima di essere
elaborato, con `@@unique([userId, dedupeKey])` — l'unicità sta sul database e non
in un controllo applicativo, perché due consegne concorrenti supererebbero
entrambe un `SELECT` preventivo.

Del messaggio si conserva il minimo: mittente, oggetto, data, esiti SPF/DKIM/ARC e
il risultato strutturato dell'estrazione. **Il corpo non viene archiviato.**

#### `PaymentProposal` _(modellata, migrazione da eseguire)_
Pagamento estratto da una ricevuta, **in attesa di approvazione**: la barriera che
impedisce a un errore di lettura dell'estrattore di entrare nello storico di cassa,
dove sarebbe una bugia permanente nel grafico.

`resolution` traduce nello schema la regola "l'evidenza vince sulla previsione":
`CREATED` se nessun pagamento esisteva per quel ciclo, `RECONCILED` se il cron ne
aveva già scritto uno e la ricevuta lo **corregge** invece di duplicarlo.

Dominio completo in [[Email_Ingestion_e_Matching]].

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

