# 2026-07-22 17:55 (+0200) — Regola 7 (Changelog Obbligatorio)

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
