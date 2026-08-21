# Email Ingestion e Matching

**Stato: progettato, non implementato.** Secondo obiettivo della roadmap, dopo il
[[Soft_Delete_Abbonamenti]].

Secondo canale di alimentazione dei dati, accanto al cron dei rinnovi e allo
scanner manuale: le ricevute arrivano da sole via email e aggiornano gli
abbonamenti senza intervento dell'utente.

Nodo padre: [[Index]]

---

## Perché è la killer feature

Oggi l'utente inserisce i dati a mano, o al più fotografa una ricevuta con
[[Lettura_Scontrini_OCR_Gemini]]. In entrambi i casi **l'aggiornamento dipende da
lui**, e i dati invecchiano: un aumento di prezzo o uno slittamento del rinnovo
restano invisibili finché qualcuno non se ne accorge.

Le ricevute però arrivano già, per email, a ogni rinnovo. Intercettarle chiude il
ciclo: il Burn Rate smette di essere una fotografia del giorno dell'inserimento e
diventa un dato vivo.

---

## Flusso logico

```
mailbox dedicata (provider inbound)
        │  webhook HTTP
        ▼
1. Ricezione        autentica la chiamata, normalizza il messaggio
        ▼
2. Parsing          estrae nome servizio, importo, data, valuta
        ▼
3. Matching         cerca l'abbonamento corrispondente dell'utente
        │
        ├── trovato ──► 4a. Aggiornamento: PaymentLog + prezzo e data di rinnovo
        │
        └── non trovato ──► 4b. Proposta di nuovo abbonamento, in attesa di conferma
```

### 1. Ricezione
Route handler dedicato, sullo stesso modello del cron dei rinnovi descritto in
[[Gestione_Pagamenti_e_Rinnovi]]: endpoint pubblico ma autenticato con un segreto
condiviso, mai aperto.

Due requisiti da tenere fermi fin dall'inizio:

- **Identificare il destinatario.** L'email deve essere riconducibile a un `User`.
  L'indirizzo mittente non basta: serve un indirizzo di inoltro per utente, o un
  token nell'indirizzo di destinazione.
- **Idempotenza.** I provider inbound ritentano la consegna. Lo stesso messaggio
  non deve produrre due `PaymentLog`, esattamente come il cron non deve produrre
  due log sullo stesso ciclo.

### 2. Parsing
Estrazione di nome, importo, valuta e data del pagamento dal corpo del messaggio
e dagli eventuali allegati.

Il progetto ha già un estrattore che fa questo lavoro su immagine, con output
vincolato a uno schema JSON rigoroso ([[Lettura_Scontrini_OCR_Gemini]]). La
struttura del risultato è la stessa, quindi conviene riusarla come formato comune
invece di inventarne una seconda: cambia la sorgente, non il contratto.

⚠️ Ogni importo estratto entra come `Decimal` e ogni data va normalizzata a
00:00:00 UTC prima di toccare il database (Regole 1 e 2).

### 3. Matching
Il passaggio che decide la qualità dell'intera feature. Dato un pagamento
estratto, trovare l'abbonamento dell'utente a cui appartiene.

Segnali disponibili, in ordine di affidabilità:

| Segnale | Forza | Nota |
| ------- | ----- | ---- |
| Nome del servizio | media | "Netflix" contro "NETFLIX.COM" contro "Netflix International B.V." — serve normalizzazione, non uguaglianza |
| Importo | alta se combinato | Da solo confonde due servizi allo stesso prezzo |
| Prossimità al `nextRenewalDate` | alta | Una ricevuta a ridosso del rinnovo atteso è quasi certamente quella |
| Valuta | filtro | Esclude, non conferma |

Il matching va trattato come **punteggio con soglia**, non come uguaglianza:
sopra soglia si aggiorna, sotto si chiede conferma. Un falso positivo scrive un
prezzo sbagliato su un abbonamento giusto, ed è l'errore più costoso perché si
propaga al Burn Rate senza che nessuno se ne accorga.

Con [[Soft_Delete_Abbonamenti]] il matching dovrà cercare **solo fra gli attivi**:
una ricevuta non può appartenere a un abbonamento già cessato.

### 4a. Aggiornamento automatico
Ad abbonamento trovato:

- si crea il `PaymentLog` con importo e data reali;
- se l'importo differisce da quello registrato, si **aggiorna il prezzo**: è il
  caso d'uso che giustifica la feature, l'aumento silenzioso;
- si allinea `nextRenewalDate` al ciclo successivo;
- si invalida la cache delle viste dipendenti (Regola 3).

Un aggiornamento di prezzo non dovrebbe essere silenzioso a sua volta: l'utente
va avvisato che qualcosa è cambiato.

### 4b. Nessuna corrispondenza
Non si crea nulla d'autorità. Si registra una proposta che l'utente conferma o
scarta, sullo stesso principio dello scanner: i dati estratti **precompilano**,
non salvano.

---

## Impatto sul modello dati

Serve almeno tracciare i messaggi già processati, per l'idempotenza — un
identificativo del messaggio con vincolo di unicità. La proposta in attesa di
conferma (4b) richiede uno stato che oggi non esiste da nessuna parte: va deciso
se modellarla come entità propria o come `Subscription` in stato bozza.

Entrambe le scelte toccano [[Database_Tabelle_e_Modelli_Prisma]] e vanno chiuse
prima di scrivere il webhook.

---

## Sicurezza

L'endpoint riceve contenuto non fidato da internet. Segreto condiviso
obbligatorio, dimensione massima del payload, nessuna esecuzione di contenuto
dell'email, e un'estrazione che non si fida mai del risultato del parser prima di
scriverlo. Vale la stessa disciplina dello scanner: gli errori tornano come
valore, non come eccezione.

---

## Collegato a
[[Gestione_Pagamenti_e_Rinnovi]] · [[Lettura_Scontrini_OCR_Gemini]] · [[Database_Tabelle_e_Modelli_Prisma]] · [[Soft_Delete_Abbonamenti]] · [[Motore_Regole_NextJS]]
