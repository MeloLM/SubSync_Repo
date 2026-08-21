# Lettura Scontrini OCR (Gemini)

Estrazione dei dati di un abbonamento dalla foto di una fattura o ricevuta, tramite
Google Gemini. È l'unica integrazione AI del progetto.

Nodo padre: [[Index]]

---

## Flusso

```
utente rilascia l'immagine nella dropzone
        ↓
compressione client-side su canvas
        ↓
Server Action ──> Gemini (immagine inline + schema JSON vincolato)
        ↓
esito tipizzato { ok, data } oppure { ok, error }
        ↓
auto-fill dei campi del form, l'utente verifica prima di salvare
```

Il passaggio finale è deliberato: i dati estratti **precompilano**, non salvano.
L'utente resta l'ultimo controllo.

---

## Scelte progettuali

### Output vincolato, non testo libero
La chiamata impone tipo di risposta JSON e uno schema rigoroso, i cui valori
ammessi per ciclo di fatturazione e tipo documento provengono dagli enum dello
schema Prisma. Il modello non può quindi restituire una stringa che il dominio non
accetta.

Campi estratti: nome, importo, valuta, ciclo, prossimo rinnovo, aliquota IVA, se
l'importo è lordo, tipo di documento. Gli ultimi tre alimentano [[Calcolo_IVA_e_Fisco]].

### Errori come valore, non come eccezione
La Server Action ritorna un'unione discriminata invece di lanciare: in produzione i
throw vengono redatti e l'utente vedrebbe un messaggio generico. Gli errori di
Gemini sono mappati in messaggi comprensibili, distinguendo chiave non valida,
superamento del limite di richieste, problemi di rete, blocco per policy, risposta
vuota o JSON non valido.

### Compressione lato client
L'immagine viene ridotta su canvas prima dell'invio. Non è un'ottimizzazione
cosmetica: senza, i payload superano il limite delle Server Action, alzato a 4mb
come rete di sicurezza (vedi [[Motore_Regole_NextJS]]).

Completano la protezione un limite di dimensione sulla dropzone, l'anteprima con
possibilità di annullare, e un avviso quando la valuta rilevata non è fra quelle
gestite.

---

## Composizione UI

Tre componenti, con responsabilità separate: la dropzone che gestisce file ed
errori, il form dell'abbonamento, e un wrapper che li cuce insieme scrivendo il
risultato nei campi tramite un handle imperativo. Il wrapper esiste proprio per non
sollevare lo stato del form. Dettagli in [[Interfaccia_Grafica_Dashboard]].

---

## Configurazione
Chiave API Gemini fra le variabili d'ambiente, con accesso al modello flash.
Senza, la funzione risponde con l'errore mappato invece di rompere la pagina.

---

## Correlato
[[Email_Ingestion_e_Matching]] — il canale email riuserà lo stesso contratto di
estrazione, cambiando la sorgente: immagine qui, corpo del messaggio là.

---

## Collegato a
[[Gestione_Pagamenti_e_Rinnovi]] · [[Calcolo_IVA_e_Fisco]] · [[Interfaccia_Grafica_Dashboard]] · [[Motore_Regole_NextJS]]
