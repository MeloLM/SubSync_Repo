# 2026-09-15 — Il banner di installazione ricorda il rifiuto

Debito di UX segnalato dal team: il banner PWA "riappare sempre".

## Cosa succedeva

`InstallPrompt` teneva il rifiuto in un `useState` locale. Chiudere il banner lo
nascondeva fino al primo ricaricamento della pagina, dopodiché il browser rilanciava
`beforeinstallprompt` e il banner tornava. Per chi non vuole installare l'app,
significava un banner a ogni visita, per sempre.

## Cosa fa adesso

Il rifiuto viene scritto in `localStorage` sotto `hide_pwa_banner` come **istante
assoluto di scadenza** (epoch ms, oggi + 30 giorni), non come flag booleano né come
contatore: un istante assoluto non ha bisogno di sapere quante volte è stato letto,
e alla scadenza il confronto è una sottrazione.

Un valore illeggibile — scritto da una versione precedente del componente, o
manomesso — viene trattato come assente e ripulito, non come "nascondi per sempre".

## File modificati

- **`components/pwa/install-prompt.tsx`** — logica di persistenza del rifiuto.
  Aggiunti `isDismissed()` e `rememberDismissal()` come funzioni fuori dal
  componente, così l'accesso a `localStorage` sta in due punti soli e non sparso
  fra gli handler. Aggiunti `role="region"` e un `aria-label` sul banner, e reso
  esplicito nel pulsante di chiusura che il silenzio dura trenta giorni.
- **`docs/App_Mobile_e_Offline_PWA.md`** — sezione "Prompt di installazione"
  riscritta con la persistenza e i due vincoli tecnici.

## Due vincoli tecnici, entrambi espliciti nel codice

**Hydration.** `localStorage` si legge in `useEffect`, mai nel corpo del
componente: leggerlo durante il render darebbe un markup diverso fra server e
client. In più c'è un flag `checked`: finché la lettura non è avvenuta il
componente rende `null`, così se `beforeinstallprompt` arrivasse prima dell'effetto
il banner non lampeggerebbe per un istante prima di sparire.

**Storage che lancia.** Ogni accesso è dentro `try/catch`. In finestra privata, o
con i dati del sito bloccati, il solo leggere `window.localStorage` solleva
un'eccezione. In caso di errore la lettura risponde "non rifiutato" e la scrittura
non fa nulla: il banner degrada esattamente al comportamento precedente, che è la
peggiore conseguenza accettabile per una feature di questo peso.

## Aggiunta oltre la lettera della richiesta

Il task chiedeva di persistere il rifiuto "se l'utente lo chiude". Viene persistito
anche quando l'utente **rifiuta la finestra nativa** del browser
(`userChoice.outcome === "dismissed"`): è la stessa decisione, presa un passo più
avanti, e senza questo il banner sarebbe tornato alla visita successiva nonostante
un "no" già espresso — cioè esattamente il fastidio da cui nasce il task.

## Verifica

- `npx tsc --noEmit` — **exit 0**
- `npx next lint` — **exit 0**, nessun warning
- `npx vitest run` — **exit 0**, 73 test su 5 file (nessun test nuovo: il
  componente dipende da `localStorage` e da un evento del browser, fuori dalla
  portata della suite attuale, che copre solo helper puri)
- `npx next build` — **exit 0**

## Osservazione emersa

⚠️ **Non collaudato in un browser.** `beforeinstallprompt` non si attiva in
sviluppo su `localhost` senza una build di produzione servita in HTTPS, quindi il
percorso completo — banner mostrato, chiusura, ricaricamento, banner assente — non è
stato percorso. La logica di scadenza è deterministica e ispezionabile
(`localStorage.getItem("hide_pwa_banner")` restituisce l'istante), ma la verifica
end-to-end resta da fare.

## Stato

Secondo di tre commit della sessione (Regola 8, banner PWA, profilo).
