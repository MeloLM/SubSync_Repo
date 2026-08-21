# Gestione Pagamenti e Rinnovi

Il cuore funzionale del prodotto: gestire gli abbonamenti, calcolare quanto costano
al mese e registrare i rinnovi. Copre CRUD, metriche e automazione.

Nodo padre: [[Index]]

---

## CRUD

Le Server Action degli abbonamenti sono l'unico punto di scrittura sull'entità.
Ogni mutazione esegue in sequenza:

1. verifica di ownership sull'utente corrente
2. normalizzazione dell'importo in `Decimal` e della data a mezzanotte UTC
3. scrittura
4. `revalidatePath` sulle viste dipendenti

Le letture (elenco e singolo) passano dal layer memoizzato descritto in
[[Database_Tabelle_e_Modelli_Prisma]] e ritornano DTO già serializzabili.

La UI di creazione e modifica condivide un unico form, descritto in
[[Interfaccia_Grafica_Dashboard]]; la creazione parte dallo scanner di
[[Lettura_Scontrini_OCR_Gemini]].

---

## Metriche

Tutte le aggregazioni restano sul server. Al client arriva un DTO con valori già
calcolati e formattati: nessun componente somma importi.

### Monthly Burn Rate
Normalizza ogni abbonamento a costo mensile (l'annuale diviso dodici, in `Decimal`)
e somma. È la metrica principale della dashboard.

### Andamento di spesa
Serie a 6 mesi del **costo mensile normalizzato**: stessa normalizzazione del
Burn Rate (annuale diviso dodici, nessun arrotondamento intermedio), quindi
l'ultimo punto della serie coincide col KPI in cima alla dashboard.

Un abbonamento entra in un mese se esisteva in un qualsiasi istante di quel mese.
⚠️ `Subscription` conserva solo `createdAt`, non una data di cessazione, e la
cancellazione rimuove il record: la serie ricostruibile è quindi **non
decrescente**, mostra la crescita della spesa ricorrente ma non le disdette
passate. Renderla esatta richiede una cancellazione logica sullo schema, vedi
[[Soft_Delete_Abbonamenti]], progettato e prossimo in roadmap.

L'aritmetica sta in un helper puro e testato, non nella Server Action.

### Prossimi rinnovi
Derivata direttamente dall'elenco, senza query aggiuntive.

Le tre metriche convivono nello stesso render della dashboard: grazie alla
memoizzazione del layer dati, il costo resta di una SELECT per entità.

---

## Rinnovi automatici

Un route handler protetto, invocato ogni giorno da Vercel Cron, chiude il ciclo di
vita dell'abbonamento senza intervento dell'utente.

### Sequenza
1. autorizza la chiamata con un bearer token dedicato: senza, risponde 401
2. seleziona gli abbonamenti in scadenza
3. crea il `PaymentLog` del ciclo
4. avanza la data di rinnovo, sempre a mezzanotte UTC
5. invalida dashboard e storico pagamenti

### Idempotenza
Il punto delicato è il terzo passaggio: due esecuzioni sullo stesso ciclo non devono
produrre due log. La protezione è nella logica di selezione, verificata su database
reale.

---

## Storico pagamenti

Vista di sola lettura sui `PaymentLog`, con importo formattato e nome del servizio
già risolto. Oggi l'unica sorgente dei log è il cron.

---

## Lavori aperti

Il secondo canale di alimentazione dei pagamenti, l'ingestione via email, non
esiste ancora: riceverà le ricevute per posta, le assocerà agli abbonamenti
esistenti e ne aggiornerà prezzo e data di rinnovo da sola. Flusso completo e
punti aperti in [[Email_Ingestion_e_Matching]].

Sul fronte ottimizzazione manca il [[Switch Suggester]], che confronta il costo
mensile con quello annuale e segnala quando conviene cambiare ciclo.

Sul fronte prestazioni resta aperta la [[Burn Rate Offline Cache]], vedi
[[App_Mobile_e_Offline_PWA]].

---

## Collegato a
[[Database_Tabelle_e_Modelli_Prisma]] · [[Motore_Regole_NextJS]] · [[Interfaccia_Grafica_Dashboard]] · [[Lettura_Scontrini_OCR_Gemini]] · [[Condivisione_Spese_e_Gruppi]] · [[Calcolo_IVA_e_Fisco]]
