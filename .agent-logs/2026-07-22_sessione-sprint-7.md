# 2026-07-22 16:56 (+0200) — Sessione Sprint 7

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
