# Auth, Utenti e Sessioni (Supabase)

Autenticazione e gestione della sessione. Supabase possiede l'identità, Prisma
possiede i dati applicativi: questa nota descrive come i due mondi restano allineati.

Nodo padre: [[Index]]

---

## Divisione delle responsabilità

Supabase gestisce credenziali, provider OAuth e ciclo di vita della sessione.
Il database applicativo (vedi [[Database_Tabelle_e_Modelli_Prisma]]) contiene una propria tabella
utenti, gestita da Prisma. Le due non sono la stessa cosa e non vanno confuse:
`auth.users` appartiene a Supabase, la tabella `User` pubblica appartiene a Prisma.

Il ponte fra le due è un trigger, non codice applicativo.

---

## I tre client

### Client server
Usato in Server Component, Server Action e Route Handler. Legge e scrive la sessione
dai cookie della richiesta. È il client di gran lunga più usato.

### Client browser
Per i pochi Client Component che devono parlare direttamente con Supabase.

### Client del middleware
Istanziato per richiesta con un adattatore sui cookie della request.
Serve solo a rinfrescare la sessione, non a leggere dati.

---

## Flusso di autenticazione

### Accesso con email e password
Il form invia a una Server Action che ritorna un esito tipizzato invece di lanciare:
gli errori vengono resi come messaggio, non come eccezione redatta in produzione.
La UI li traduce in toast.

### Accesso con Google
La Server Action costruisce l'URL di redirect a partire dagli header della richiesta
e delega a Supabase. Il ritorno passa dal route handler di callback, che scambia il
codice PKCE per una sessione e reindirizza alla dashboard. Lo stesso handler serve
i link di conferma email.

Perché OAuth funzioni servono le pagine legali pubbliche descritte in
[[Motore_Regole_NextJS]]: sono un requisito della verifica Google, non un dettaglio.

### Uscita
Server Action che chiude la sessione e reindirizza, richiamata dal profilo.

---

## Protezione delle rotte

Due meccanismi distinti, spesso confusi:

| Meccanismo | Quando agisce | Cosa fa |
| ---------- | ------------- | ------- |
| Middleware | Prima del render, su ogni richiesta | Rinfresca il cookie di sessione e reindirizza a `/login` chi non è autenticato nel gruppo `(dashboard)` |
| Helper di identità | Dentro il render | Risolve l'utente corrente e il suo `userId`, memoizzato per richiesta |

Il middleware decide **se** puoi entrare. L'helper decide **quali dati** sono tuoi.
Il secondo è il punto unico di binding sessione-record: ogni query del progetto
filtra sullo `userId` che restituisce.

Le rotte marketing e `/login` restano fuori dalla protezione.

---

## Sincronizzazione degli utenti

Un trigger PostgreSQL su `auth.users` replica ogni nuovo utente dentro la tabella
Prisma al momento della registrazione. È `SECURITY DEFINER` con `search_path` fisso,
così può scrivere fra schemi diversi, ed è idempotente.

Conseguenza pratica: al primo render il record esiste già, e l'applicazione non ha
bisogno di un upsert difensivo a ogni accesso.

Due avvertenze operative:

- **Non è una migrazione Prisma.** Vive su `auth`, schema che Prisma non gestisce.
  Va eseguito a mano nel SQL Editor su ogni nuovo progetto Supabase.
- Serve anche a [[Condivisione_Spese_e_Gruppi]]: gli inviti sono per email e possono precedere
  l'account, ed è il trigger a far esistere l'utente quando finalmente si registra.

---

## Dati di identità dell'account

Il **nome visualizzato** vive nei `user_metadata` di Supabase, sotto `full_name`,
e non in una colonna della tabella applicativa. È un dato di identità
dell'account: duplicarlo sul database applicativo significherebbe tenerne
allineate due copie senza che nessuna delle due sia autorevole.

Conseguenza sul codice che lo legge: i metadata sono JSON libero, quindi il valore
può mancare, essere vuoto o non essere una stringa. Va normalizzato a ogni lettura,
mai dato per buono. Un nome assente non è un errore — l'interfaccia ricade
sull'email — e svuotare il campo è una richiesta legittima di rimuoverlo.

La scrittura passa da una Server Action, non dal client browser, pur usando la
stessa API `auth.updateUser`. Due ragioni: tutte le mutazioni del progetto passano
dalle Server Action, e la Regola 3 impone `revalidatePath` su ogni mutazione, che
esiste solo lato server. Senza, l'intestazione del profilo continuerebbe a mostrare
il nome vecchio fino a un ricaricamento completo.

⚠️ La barra laterale mostra ancora l'email, non il nome: vive nel layout della
dashboard e `revalidatePath("/profile")` non la tocca. Allinearla richiede
invalidare il layout, non solo la pagina. Vedi [[Interfaccia_Grafica_Dashboard]].

---

## Collegato a
[[Motore_Regole_NextJS]] · [[Database_Tabelle_e_Modelli_Prisma]] · [[Condivisione_Spese_e_Gruppi]]
