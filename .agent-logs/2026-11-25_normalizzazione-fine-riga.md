# Normalizzazione fine riga, .claude/ fuori da git, backlog — 2026-11-25

## Richiesta
Commit di manutenzione del repository prima dell'intervento 2 (validazione zod).

## File creati o modificati
- `.gitattributes` (nuovo): `* text=auto eol=lf`. Normalizza a LF i file di testo
  all'ingresso nell'indice, così i file lavorati in CRLF su Windows non producono
  diff fatti solo di fine riga.
- `.gitignore`: aggiunta la voce `/.claude/` (configurazione locale della sessione
  Claude Code, non versionata).
- `TODO.md`: una sola riga di backlog aggiunta dall'utente (database di produzione
  separato dalla sandbox e migrazioni tolte dallo script build).
- `.agent-logs/2026-11-23_indagine-errore-html-prerender.md`: log dell'indagine
  sul prerender, rimasto non tracciato; entra in questo commit senza modifiche.

## Verifica
Nessun codice toccato: tsc, lint, vitest e build non eseguiti per questo commit.
Verificato con `git ls-files --eol` che l'indice contiene già LF.

## Note di configurazione
Nessuna.

## Osservazioni emerse
Alcuni file di `docs/` (es. `Motore_Regole_NextJS.md`) risultano CRLF nella copia di
lavoro: con `.gitattributes` entrano nell'indice normalizzati a LF.
