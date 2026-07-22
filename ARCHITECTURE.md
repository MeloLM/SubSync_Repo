# ARCHITECTURE — SubSync

Questo documento definisce la struttura del progetto e le **regole architetturali
vincolanti**. Non sono opzionali: sono i pilastri su cui si fonda la correttezza
dell'applicazione (accuratezza monetaria, gestione date, coerenza della cache).

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

## Regole architetturali

### Regola 1 — Calcoli monetari sempre con Decimal
È **obbligatorio** usare `Decimal.js` oppure `Prisma.Decimal` per **qualsiasi**
importo o calcolo monetario.
- **VIETATO** `number`/`float`: introduce errori di arrotondamento in virgola
  mobile (es. `0.1 + 0.2 !== 0.3`), inaccettabili in ambito finanziario.
- I campi monetari nello schema Prisma sono di tipo `Decimal`.
- Somme, divisioni (`annuale / 12`) e aggregazioni operano su istanze `Decimal`.

### Regola 2 — Date di rinnovo normalizzate a 00:00:00 UTC
Tutte le `nextRenewalDate` **devono** essere forzate a `00:00:00 UTC` **prima del
salvataggio**.
- Evita i bug di fuso orario (off-by-one day) tra client e server.
- Normalizzazione centralizzata in `lib/date.ts`, applicata in ogni Server Action
  di mutazione prima della scrittura sul DB.

### Regola 3 — `revalidatePath` su ogni mutazione
Ogni Server Action che **muta** lo stato del DB (create / update / delete)
**DEVE** chiamare `revalidatePath` sul/sui path interessati.
- Garantisce che la cache di Next.js sia invalidata e le viste riflettano lo stato
  reale del database subito dopo la scrittura.

### Regola 4 — Aggregazione del Monthly Burn Rate isolata sul server
La logica di calcolo e aggregazione del **Monthly Burn Rate** è confinata
**esclusivamente** lato server (in `actions/burn-rate.actions.ts`).
- Definizione:

  ```
  Monthly Burn Rate = Σ(costo abbonamenti mensili) + Σ(costo abbonamenti annuali) / 12
  ```

- Il client **non** ricalcola né duplica la logica: riceve il valore già aggregato.
  Singola fonte di verità per i KPI, nessuna divergenza tra le viste.

### Regola 5 — Architettura UI Modulare e Mobile-First
Ogni vista complessa deve essere frammentata in micro-componenti (es. separando
i form, le card e la logica di layout in file distinti dentro `components/`). È
severamente vietato creare file di pagina monolitici. Il design deve essere
sviluppato in ottica Mobile-First utilizzando i breakpoint di Tailwind CSS.
Questo approccio previene il sovraccarico cognitivo (sia umano che dell'IA)
durante le modifiche UI.

### Regola 6 — Responsive Design e Breakpoint Vincolanti
I breakpoint standard di Tailwind sono **legge assoluta** per il layout. Sono
vietate deroghe che facciano affiancare la sidebar sotto la soglia desktop.

- **Mobile (default, `< 768px`)** — layout a **singola colonna, 100% width**.
  **Nessuna sidebar affiancata consentita**: la navigazione vive in un **Header
  superiore** (menu a tendina).
- **Tablet (`md:` 768px – 1024px)** — layout di transizione.
- **Desktop (`lg:` ≥ 1024px)** — layout a **due colonne**: Sidebar laterale
  fissa + Contenuto.

Conseguenza operativa: la sidebar laterale esiste **solo** da `lg:` in su
(`hidden lg:flex`); sotto `lg` la navigazione è esclusivamente nell'header mobile.

### Regola 7 — Changelog Obbligatorio
Al termine di **ogni** esecuzione/task, **prima di chiedere l'ok per il commit**,
è **tassativo** aggiornare il diario di bordo in `.agent-logs/`
(`sprint-N-changelog.md`) con un blocco datato che riepiloghi in dettaglio:
- i file **creati/modificati** e la motivazione;
- l'esito della **verifica** (`tsc --noEmit` / `next build`);
- eventuali **note di configurazione** (es. step manuali su Supabase/Vercel).

Il changelog è di **sola documentazione** (non entra nel bundle Next.js) e
costituisce la traccia cronologica per sessione. **Nessun commit** va richiesto
senza aver prima aggiornato questa traccia. Nuovo sprint → nuovo file
`sprint-N-changelog.md` nella stessa cartella.

---

## Schema relazionale (bozza)

```
User (1) ──────< (N) Subscription (1) ──────< (N) PaymentLog
```

- **User (1) → (N) Subscription**: un utente possiede molti abbonamenti.
- **Subscription (1) → (N) PaymentLog**: ogni abbonamento ha uno storico pagamenti.

### Entità

#### `User`
| Campo       | Tipo     | Note                |
| ----------- | -------- | ------------------- |
| `id`        | String   | PK (cuid)           |
| `email`     | String   | univoco             |
| `createdAt` | DateTime |                     |

#### `Subscription`
| Campo             | Tipo        | Note                                  |
| ----------------- | ----------- | ------------------------------------- |
| `id`              | String      | PK                                    |
| `userId`          | String      | FK → User                             |
| `name`            | String      | Nome servizio (es. "Netflix")         |
| `amount`          | **Decimal** | Importo (Regola 1 — mai float)        |
| `currency`        | String      | es. "EUR"                             |
| `billingCycle`    | Enum        | `MONTHLY` \| `YEARLY`                 |
| `nextRenewalDate` | DateTime    | Forzata a 00:00:00 UTC (Regola 2)     |
| `createdAt`       | DateTime    |                                       |

#### `PaymentLog`
| Campo            | Tipo        | Note                          |
| ---------------- | ----------- | ----------------------------- |
| `id`             | String      | PK                            |
| `subscriptionId` | String      | FK → Subscription             |
| `amount`         | **Decimal** | Importo pagato (Regola 1)     |
| `paidAt`         | DateTime    | Data pagamento (UTC)          |

---

## Direttive Operative per l'Agente

- **[REGOLA DI VALIDAZIONE]**: Al termine di ogni modifica, non avviare 'pnpm dev'. Esegui obbligatoriamente 'pnpm build'. Se la build fallisce (max 2 tentativi), ferma tutto e scrivi l'errore nel TODO.md sotto "Errors to fix".
- **[LOG DI CONFERMA]**: Alla fine di ogni intervento, genera un report testuale con: esito validazione, file modificati, e prossima task logica in coda.
