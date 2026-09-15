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

### Andamento di spesa: due metriche, non una

La stessa spesa si misura in due modi, e confonderli produce grafici che mentono.

**Competenza** — il costo si spalma sul periodo a cui si riferisce: un annuale da
120 € pesa 10 € su ognuno dei dodici mesi. È la normalizzazione del Burn Rate
(nessun arrotondamento intermedio), quindi il punto del mese corrente coincide col
KPI in cima alla dashboard. Risponde a *"quanto mi costa in media al mese"*.

**Cassa** — il denaro esce quando esce: quei 120 € gravano tutti sul mese del
rinnovo. Risponde a *"in quali mesi spenderò di più"*, e la normalizzazione
nasconderebbe esattamente i picchi che la domanda cerca.

Le due non vanno mai sommate fra loro, ma su una finestra di dodici mesi senza
variazioni totalizzano lo stesso importo — il Burn Rate per dodici. È l'invariante
che dimostra che la proiezione non inventa né perde denaro, ed è coperto da test.

#### Da dove vengono i dati

| | Passato | Futuro |
| --- | --- | --- |
| Competenza | ricostruzione dai record, **include i cessati** | linea piatta al Burn Rate corrente |
| Cassa | `PaymentLog` reali: un fatto storico, non si ricostruisce | proiezione dei rinnovi, **solo attivi** |

Il filtro degli attivi è quindi **speculare** fra le due metriche, e va letto come
tale: la competenza ha bisogno dei cessati per sapere in quali mesi contribuivano
(vedi [[Soft_Delete_Abbonamenti]]), la cassa li esclude perché un abbonamento
disdetto non ha rinnovi futuri. Lo storico di cassa non filtra affatto: i
`PaymentLog` sopravvivono alla disdetta proprio grazie al soft-delete.

#### Finestre

Tre ampiezze, precalcolate tutte insieme sul server: cambiare vista è una scelta
del client, non un round-trip, e non costa una query in più perché tutte le serie
nascono dalla stessa lettura memoizzata.

- **6 mesi** — retrospettiva.
- **1 anno** — sei mesi trascorsi più sei proiettati, a cavallo del presente.
- **30 giorni** — granularità **giornaliera**, solo cassa: un mese su bucket
  mensili sarebbe una barra sola, e la domanda a cui la vista risponde è *"quando
  mi addebitano cosa"*. I giorni senza addebiti non entrano nella serie.

#### Il confine fra consolidato e proiettato

È fissato alla mezzanotte UTC di domani. Il cron gira alle 06:00 e scrive un
`PaymentLog` datato al giorno del rinnovo: mettendo lì il confine, un rinnovo di
oggi è già coperto dallo storico se il cron è passato, e la proiezione — che
riparte dalla data ormai avanzata — non lo riconta. Se il cron non è ancora
passato, l'addebito di oggi resta fuori da entrambe le metà per poche ore:
sottostima accettata, preferibile a un totale gonfiato che nulla segnalerebbe.

⚠️ Come il Burn Rate, i totali sommano importi di valute diverse senza
convertirli. Difetto noto e accettato, vedi [[Currency Normalizer]].

L'aritmetica sta in helper puri e testati, non nelle Server Action.

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

### Saturazione di fine mese
L'avanzamento della data **satura** il giorno all'ultimo disponibile del mese
invece di lasciarlo traboccare: un mensile del 31 gennaio rinnova il 28 febbraio,
la semantica di ogni sistema di billing reale.

Prima della correzione il giorno traboccava nel mese successivo e **febbraio
spariva del tutto**, spostando poi l'abbonamento al giorno 3 in modo permanente.
Il bug era invisibile finché nessuno guardava le date future: è emerso
progettando la proiezione di cassa, che sulle stesse date si fonda.

⚠️ Limite residuo: la saturazione è irreversibile, perché il giorno di ancoraggio
originale non è memorizzato. Dopo un passaggio da un mese corto il 31 diventa 28 e
da lì in poi resta 28. Il fix completo richiede un campo `anchorDay` sullo schema.
È anche la ragione per cui la proiezione enumera i rinnovi **iterando la stessa
funzione del cron** invece di ricalcolarli dall'ancora: una previsione più elegante
divergerebbe da ciò che il cron farà davvero, e il grafico non può promettere una
data che il sistema non rispetterà.

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
