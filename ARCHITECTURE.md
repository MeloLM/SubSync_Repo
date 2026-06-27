# ARCHITECTURE — SubSync

Questo documento definisce la struttura del progetto e le **regole architetturali
vincolanti**. Non sono opzionali: sono i pilastri su cui si fonda la correttezza
dell'applicazione (accuratezza monetaria, gestione date, coerenza della cache).

---

## Struttura delle cartelle (App Router)

```
subsync/
├── app/
│   ├── (dashboard)/                # Route group autenticato / area applicativa
│   │   ├── layout.tsx              # Layout dashboard (sidebar, header KPI)
│   │   ├── page.tsx                # Dashboard principale (KPI + Burn Rate)
│   │   ├── subscriptions/
│   │   │   ├── page.tsx            # Lista abbonamenti
│   │   │   └── new/page.tsx        # Form nuovo abbonamento
│   │   └── payments/
│   │       └── page.tsx            # Storico pagamenti (PaymentLog)
│   ├── api/
│   │   └── cron/renewals/route.ts  # Endpoint Cron Job rinnovi (test locale)
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Stili globali Tailwind
│
├── actions/                        # Server Actions (mutazioni + aggregazione)
│   ├── subscription.actions.ts     # CRUD Abbonamenti
│   └── burn-rate.actions.ts        # Calcolo Monthly Burn Rate (server-only)
│
├── components/                     # Componenti React riutilizzabili (UI)
│   ├── ui/                         # Primitive (Button, Card, Input, ...)
│   ├── kpi/                        # Card KPI della dashboard
│   └── forms/                      # Form e field
│
├── lib/                            # Utility e client condivisi
│   ├── prisma.ts                   # Singleton Prisma Client
│   ├── money.ts                    # Helper Decimal per i calcoli monetari
│   └── date.ts                     # Helper normalizzazione date UTC
│
├── prisma/
│   ├── schema.prisma               # Schema del database
│   └── migrations/                 # Migrazioni generate da Prisma
│
├── docker-compose.yml              # Servizio PostgreSQL
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
