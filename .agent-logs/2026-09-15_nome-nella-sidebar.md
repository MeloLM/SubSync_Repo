# 2026-09-15 — Il nome dell'utente arriva alla barra laterale

Chiusura del debito lasciato aperto dal blocco precedente.

## La premessa del task era incompleta

Il task chiedeva di portare l'invalidazione a `revalidatePath("/", "layout")`
perché questo avrebbe "aggiornato immediatamente il nome nella sidebar".

Verificando prima di dichiarare risolto: **la barra laterale non ha mai mostrato il
nome.** `app/(dashboard)/layout.tsx` calcolava `const email = user.email ?? "utente"`
e passava quello a `SidebarContent`, che lo rendeva come riga principale del blocco
utente. Invalidare il layout lo avrebbe fatto ri-renderizzare producendo esattamente
lo stesso markup: nessun effetto visibile, e un fix dichiarato risolto senza esserlo.

Sono due problemi distinti — la cache e ciò che il componente legge — e risolverne
uno solo non produce niente. Fatti entrambi.

## File modificati

- **`actions/auth.actions.ts`** — `revalidatePath("/", "layout")` al posto di
  `revalidatePath("/profile")`. Martello volutamente largo (invalida l'albero sotto
  il layout radice), ma la frequenza dell'evento lo giustifica: un utente cambia
  nome una volta, non a ogni sessione.
- **`lib/auth.ts`** — nuovo `fullNameOf(user)`. La normalizzazione di `full_name`
  era già scritta nella pagina profilo e sarebbe servita identica nel layout: due
  copie divergenti mostrerebbero due nomi diversi nella stessa schermata. Un punto
  solo, prima che la seconda copia esistesse.
- **`app/(dashboard)/layout.tsx`** — calcola `displayName` (nome o, in sua assenza,
  email) e `subtitle`, e li passa a entrambe le istanze di `SidebarContent`
  (sidebar desktop e pannello mobile). L'iniziale dell'avatar deriva ora dal nome,
  non dall'email: chi si chiama Marco si aspetta una M.
- **`components/dashboard/sidebar-content.tsx`** — prop `email` sostituita da
  `displayName` + `subtitle`. La riga secondaria mostra l'email quando c'è un nome,
  altrimenti resta l'affordance "Profilo e impostazioni": l'email non sparisce, si
  sposta.
- **`app/(dashboard)/profile/page.tsx`** — usa `fullNameOf`, normalizzazione locale
  rimossa.
- **`docs/Auth_Utenti_e_Sessioni_Supabase.md`** — sostituita l'avvertenza "la barra
  mostra ancora l'email" con la sezione su dove compare il nome e cosa comporta
  invalidare, incluso il fatto che la cache da sola non basta.
- **`TODO.md`** — voce spuntata.

## Verifica

- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx vitest run` — **exit 0**, 73 test su 5 file (invariati: il cambio riguarda
  layout e cache, entrambi fuori dalla portata di una suite di helper puri)
- `npx next build` — **exit 0**

## Osservazione emersa

⚠️ **Non collaudato in un browser.** Il percorso completo — salvataggio del nome,
barra laterale aggiornata senza ricaricamento, sia su desktop sia nel pannello
mobile — non è stato percorso. È il punto in cui `revalidatePath("/", "layout")`
va visto funzionare davvero.

## Stato

Primo di due commit della sessione (fix cache/sidebar, progettazione ingestion).
