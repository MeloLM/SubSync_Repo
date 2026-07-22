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
