# Motore e Regole Next.js

Impianto App Router di SubSync: come sono organizzate le rotte, dove passa il
confine server/client e quali regole governano cache e stati di caricamento.

Nodo padre: [[Index]]

---

## Route group

L'applicazione è divisa in tre gruppi, con regimi di accesso diversi.

### `(auth)` — accesso
Rotta unica `/login`: una sola pagina con toggle fra accesso e registrazione,
compreso il pulsante Google. È la destinazione di ogni redirect di
[[Auth_Utenti_e_Sessioni_Supabase]] quando la sessione manca.

### `(marketing)` — pubblico
Layout minimo con logo e ritorno al login, contiene `/privacy` e `/terms`.
Sono pagine statiche ma **non accessorie**: la verifica OAuth di Google le richiede
come requisito, quindi non vanno rimosse né rese private.

### `(dashboard)` — area applicativa
Tutto ciò che richiede sessione. Il layout del gruppo risolve l'utente corrente e il
numero di inviti pendenti, poi monta la shell descritta in
[[Interfaccia_Grafica_Dashboard]]. Contiene le rotte di [[Gestione_Pagamenti_e_Rinnovi]],
[[Condivisione_Spese_e_Gruppi]] e il profilo.

| Rotta | Responsabilità |
| ----- | -------------- |
| `/` | KPI: burn rate, prossimi rinnovi, andamento di spesa |
| `/subscriptions` | Elenco abbonamenti |
| `/subscriptions/new` | Creazione, con scansione ricevuta come punto di partenza |
| `/subscriptions/[id]/edit` | Modifica |
| `/subscriptions/[id]/split` | Condivisione, vista proprietario |
| `/shared` | Condivisione, vista invitato |
| `/payments` | Storico pagamenti |
| `/profile` | Account e logout |
| `/invite` | QR di installazione della PWA, vedi [[App_Mobile_e_Offline_PWA]] |

### Rotte di sistema
Fuori dai gruppi vivono il root layout (metadata, viewport, Toaster globale,
bootstrap PWA), il manifest e due route handler: il callback di autenticazione
(vedi [[Auth_Utenti_e_Sessioni_Supabase]]) e il cron dei rinnovi (vedi
[[Gestione_Pagamenti_e_Rinnovi]]).

---

## Confine server/client

La regola che governa tutto: **i dati si risolvono sul server, il client riceve solo
ciò che è già serializzabile**.

### Cosa resta sul server
Accesso al database, identità dell'utente, ogni aggregazione monetaria. Nessun
componente client importa il client Prisma né esegue somme su importi.

### Cosa attraversa il confine
Solo DTO: i `Decimal` e i `Date` di Prisma diventano `string` prima di uscire.
La conversione è centralizzata nei mapper descritti in [[Database_Tabelle_e_Modelli_Prisma]].
Un campo aggiunto al model ma non al DTO non arriva alla UI, e Next solleva
l'errore di serializzazione al primo passaggio.

### Chi è Client Component
Solo ciò che ha davvero bisogno di stato o eventi del browser: form con
`useTransition`, drawer di navigazione, dropzone dello scanner, grafico, banner PWA,
error boundary. Tutto il resto è Server Component per difetto.

### Errori come valore, non come eccezione
In produzione Next.js **oscura il messaggio** di ogni eccezione lanciata da una Server
Action: il client riceve un testo generico e l'utente non sa cosa correggere. Per questo
le mutazioni restituiscono un esito tipizzato condiviso, `ActionResult<T>`: o
`{ ok: true, data }` o `{ ok: false, error }`, con `error` in italiano.

- **Errore atteso** (input non valido, risorsa non trovata o altrui, duplicato, sessione
  scaduta): diventa `{ ok: false, error }` e raggiunge sempre la UI.
- **Errore inatteso** (database irraggiungibile, bug): resta un `throw`, e l'error
  boundary lo intercetta.
- Le mutazioni senza payload ritornano `ActionResult<null>`.
- I componenti client **leggono `ok`** prima di mostrare il toast di successo: una
  `await` senza controllo dell'esito segnalerebbe come riuscita un'operazione fallita.

Un piccolo modulo di helper traduce i casi ricorrenti: l'utente corrente come
`null` anziché eccezione quando la sessione manca, e il riconoscimento dei codici
Prisma attesi (record assente, violazione di unicità) da mappare su un messaggio.

### Validazione dell'input sul server
Il client non è fidato: ogni mutazione di abbonamenti e split valida l'input **prima** di
toccare il database, con schemi zod raccolti in `lib/validation/`, un file per dominio
(abbonamenti, split) più i mattoni comuni. Sono helper puri, testati accanto al codice.

- Lo schema **valida e normalizza** (nome e email tagliati, email in minuscolo, chiavi
  sconosciute scartate), ma **non converte**: gli importi e le percentuali restano
  stringhe e la conversione resta a `money()` (Regola 1), la data resta una stringa
  `AAAA-MM-GG` e la mezzanotte UTC resta a `toUtcMidnight()` (Regola 2).
- L'action usa solo l'**output** dello schema, mai l'input grezzo.
- Il primo errore diventa il `error` di `{ ok: false, error }`, in italiano: la UI lo
  mostra già, senza modifiche.
- Gli schemi non toccano il database. Ciò che richiede una lettura (la categoria è
  dell'utente? l'abbonamento è suo e attivo? l'email è già invitata?) resta nell'action,
  dopo lo schema.
- Gli enum derivano dallo schema Prisma: un valore nuovo nel database è accettato senza
  una seconda lista da tenere allineata.

Applicato a [[Gestione_Pagamenti_e_Rinnovi]] e [[Condivisione_Spese_e_Gruppi]]; lo stesso
schema, con unione discriminata propria, regge lo scanner di
[[Lettura_Scontrini_OCR_Gemini]] e gli esiti di [[Auth_Utenti_e_Sessioni_Supabase]].
Le **letture** non cambiano: restituiscono il dato (o `null`) e lanciano se la sessione
manca.

---

## Cache e invalidazione

### `force-dynamic` sulle rotte con dati utente
Dashboard, abbonamenti, pagamenti, condivisi, profilo e le pagine `[id]` sono
dichiarate dinamiche: mostrano dati per-utente che non hanno senso in cache statica.

### `revalidatePath` su ogni mutazione
Regola vincolante: nessuna scrittura si conclude senza invalidare le viste che
dipendono da quel dato. Vale per le Server Action di [[Gestione_Pagamenti_e_Rinnovi]] e
[[Condivisione_Spese_e_Gruppi]] e per il cron dei rinnovi.

### Memoizzazione per richiesta
Il layer di lettura è avvolto in `React.cache`: più componenti nello stesso render
possono chiedere gli stessi dati senza moltiplicare le query. È ciò che permette
alla dashboard di comporre tre metriche diverse con una sola SELECT per entità.
Dettagli in [[Database_Tabelle_e_Modelli_Prisma]].

---

## Stati e resilienza

Ogni livello ha la sua rete di sicurezza:

- **Error boundary** — uno alla radice, uno sul gruppo `(dashboard)` con retry
- **Skeleton** — `loading.tsx` su dashboard, abbonamenti e pagamenti, costruiti
  sulla stessa primitiva descritta in [[Interfaccia_Grafica_Dashboard]]
- **Empty state** — componente condiviso su liste, storico e condivisioni
- **Toast** — feedback di esito centralizzato via Sonner nel root layout

---

## Configurazione rilevante

- `serverActions.bodySizeLimit` a 4mb, richiesto da [[Lettura_Scontrini_OCR_Gemini]]
- Cron giornaliero dichiarato in `vercel.json`, vedi [[Gestione_Pagamenti_e_Rinnovi]]
- La build di rilascio esegue `prisma generate` prima di `next build`

---

## Collegato a
[[Auth_Utenti_e_Sessioni_Supabase]] · [[Database_Tabelle_e_Modelli_Prisma]] · [[Interfaccia_Grafica_Dashboard]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[App_Mobile_e_Offline_PWA]]
