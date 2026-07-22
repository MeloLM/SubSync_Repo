# Sprint 7 — Changelog (Diario di bordo)

> Traccia cronologica delle modifiche strutturali, architetturali e di refactoring,
> una sezione per sessione. È un file di **sola documentazione**: non viene incluso
> nel bundle Next.js, quindi **nessun impatto sulla build o sulle prestazioni in
> produzione**.

---

## 2026-07-22 16:56 (+0200) — Sessione Sprint 7

- **Refactoring `/subscriptions`** (Regola 5 — UI modulare & Mobile-First): lista
  frammentata in 7 micro-componenti (`subscriptions-header`, `subscription-list`
  orchestratore, `subscription-card` 📱, `subscription-table` + `subscription-row`
  🖥️, `cycle-badge`, `subscription-actions`); `page.tsx` ridotto a componente
  sottile; formatter centralizzati (`formatMoney` + nuovo `formatDateUTC` in
  `lib/date.ts`). Card su mobile, tabella su desktop. → commit `c394097`.
- **Aggiornamento OCR Vision**: `responseSchema` + `systemInstruction` estesi per
  estrarre i dati fiscali (`vatRate`, `amountIsGross`, `documentType`); ritorno
  dell'action con default logici (22 / true / RECEIPT) → mai `undefined`;
  `subscription-form` trasporta i campi fiscali fino al salvataggio. → commit `c3dce70`.
- **Sidebar mobile a tendina + Regola 6**: sidebar consentita solo da `lg:`
  (`hidden lg:flex lg:w-60 lg:flex-col`), header mobile `lg:hidden`, navigazione a
  **tendina** (dropdown `absolute top-full`) al posto dell'offcanvas laterale;
  aggiunta la **Regola 6** (Responsive Design e Breakpoint Vincolanti) in
  `ARCHITECTURE.md`; Burn Rate `text-4xl sm:text-5xl` (no overflow su mobile).
  → commit `95d0d5e`.
- **Consolidamento**: 3 commit tematici + push di 7 commit su `origin/main`
  (`2dba255..95d0d5e`). Working tree pulito.

---

## 2026-07-22 17:17 (+0200) — Fix autenticazione (callback OAuth, UI, trigger DB)

- **Fix loop OAuth (`app/auth/callback/route.ts`)**: riscritta la rotta col pattern
  request→response. I cookie di sessione da `exchangeCodeForSession` ora vengono
  scritti **direttamente sulla response di redirect** (client SSR inline con
  `getAll` da `request.cookies` e `setAll` su `response.cookies`), invece di
  affidarsi a `next/headers` + `NextResponse.redirect` (che non attacca in modo
  affidabile i `Set-Cookie` → sessione persa → redirect a /login = il loop).
  Redirect finale a `next ?? "/"` (in questa app la dashboard è la root `/`,
  non esiste `/dashboard`).
- **UX login (`components/forms/login-form.tsx`)**: aggiunto toggle
  **mostra/nascondi password** (icone `Eye`/`EyeOff`) dentro l'input; `type`
  commuta tra `password` e `text`; pulsante accessibile (`aria-label`/`aria-pressed`),
  padding input a `!pr-10` per non sovrapporre il testo all'icona.
- **Trigger sync utenti (`supabase/migrations/sync_users_trigger.sql`)**: script da
  incollare in Supabase. ⚠️ Il progetto usa già `public."User"` (Prisma), non
  `public.users`: il trigger `AFTER INSERT ON auth.users` → funzione
  `handle_new_user()` (SECURITY DEFINER) popola la tabella Prisma esistente
  (idempotente, `on conflict do nothing`), evitando una seconda tabella divergente.
  Incluso backfill opzionale.
- Verifica: `tsc --noEmit` + `next build` Exit 0. Trigger SQL **eseguito su
  Supabase** (attivo su `auth.users`) e **backfill utenti storici** completato.
  Consolidato nel commit `fix(auth): callback OAuth PKCE, toggle password e trigger
  sync utenti (Sprint 7)` + push su origin. Reminder: abilitare il provider Google
  in Supabase → Authentication → Providers.

---

## 2026-07-22 17:48 (+0200) — Scaffold pagine legali + Schermata Invito (QR)

- **Pagine legali (route group `(marketing)`)**: nuove rotte pubbliche `/privacy` e
  `/terms` (server component, statiche) con layout condiviso e testo placeholder
  "Lorem ipsum" da sostituire. **Middleware** aggiornato per escludere `privacy` e
  `terms` dalla protezione (necessario per l'approvazione OAuth Google). Aggiunto un
  footer legale nel `login-form` ("Accedendo accetti i Termini e la Privacy Policy").
- **Schermata Invito (`/invite`)**: installata `qrcode.react@4.2.0`; nuova rotta
  `app/(dashboard)/invite/page.tsx` (sottile) + `components/invite/invite-card.tsx`
  (client). QR **SVG** che codifica `window.location.origin` (generato in locale →
  nessuna richiesta esterna, PWA/CSP-safe), su sfondo chiaro per la scansionabilità.
  Azioni: **Copia link** (`navigator.clipboard`) e **Condividi** via Web Share API
  (`navigator.share`) mostrato solo se supportato, con fallback a copia. Voce "Invita"
  aggiunta al nav (`sidebar-content`), visibile in sidebar desktop e tendina mobile.
- **TODO.md**: task QR Code spuntata.
- Verifica: `tsc --noEmit` + `next build` **Exit 0** (16/16 pagine: `/invite`,
  `/privacy`, `/terms` nuove). In attesa di conferma per il commit.

---

## 2026-07-22 17:55 (+0200) — Regola 7 (Changelog Obbligatorio)

- **`ARCHITECTURE.md`**: aggiunta la **Regola 7 — Changelog Obbligatorio**: al
  termine di ogni task, prima di chiedere l'ok per il commit, è tassativo
  aggiornare questo diario con un blocco datato (file toccati + motivazione, esito
  verifica, note di config). Formalizza come standard di progetto la prassi già in
  uso in queste sessioni.
- **Backfill log**: verificato che lo storico dei fix Auth (callback OAuth
  request→response, toggle password, trigger SQL `auth.users → public."User"`) e
  del push era **già registrato** nell'entry delle `17:17` → nessuna duplicazione
  aggiunta.
- **Pagine Legali + QR (`/invite`)**: già implementate e verificate nell'entry delle
  `17:48` (route `(marketing)` privacy/terms + footer login + middleware; `/invite`
  con `qrcode.react`, copia link, Web Share). Nessuna nuova modifica di codice qui.
- Verifica: `next build` **Exit 0** (nessun impatto: modificati solo file di doc).
  In attesa di conferma per il commit.
