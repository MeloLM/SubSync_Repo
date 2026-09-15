# Interfaccia Grafica e Dashboard

Come è organizzata l'interfaccia: la shell di navigazione, le famiglie di componenti
per dominio e le regole responsive che ne determinano la forma.

Nodo padre: [[Index]]

---

## Shell di navigazione

Il layout dell'area applicativa monta un contenuto di navigazione **unico**,
riutilizzato in due contenitori diversi: la sidebar fissa su desktop e un drawer a
comparsa su mobile. Una sola fonte di verità per le voci di menu, due rese.

Il drawer si richiude al cambio rotta e blocca lo scroll del corpo pagina mentre è
aperto. Porta il badge degli inviti pendenti di [[Condivisione_Spese_e_Gruppi]], risolto dal
layout e non dal componente.

---

## Regole responsive

Il progetto è mobile-first, con due vincoli espliciti:

- **La sidebar esiste solo da `lg` in su.** Sotto quella soglia la navigazione è
  esclusivamente nell'header mobile: non è una scelta di stile, è l'unico accesso
  al menu.
- **Le liste cambiano forma, non solo dimensione.** Su mobile si rendono come card,
  da `md` in su come tabella. Il componente di lista sceglie fra le due rese e
  gestisce il caso vuoto.

Card e riga di tabella sono gemelli: stesso contenuto, stesso badge di ciclo, stesso
gruppo di azioni, layout diverso.

---

## Famiglie di componenti

### Abbonamenti
Lista con le due rese, card e riga, badge del ciclo di fatturazione, gruppo di
azioni (modifica, condividi, elimina) e intestazione con la CTA di creazione.
L'eliminazione ha dialog di conferma e stato pending.

### Form
Un solo form di abbonamento serve creazione e modifica. Espone un handle imperativo
che permette a [[Lettura_Scontrini_OCR_Gemini]] di riempirne i campi senza sollevare lo
stato. Copre anche gli attributi di [[Calcolo_IVA_e_Fisco]].

Il form di accesso gestisce login e registrazione con un toggle, più il pulsante
Google.

### Condivisione
Tre componenti, uno per azione: invito per email, riga del partecipante con quota e
saldo, pulsanti di risposta all'invito.

### Visualizzazione
Il grafico dell'andamento è costruito con **Recharts** (`BarChart` dentro
`ResponsiveContainer`: larghezza fluida, altezza che cresce solo da `sm:` in su).
Riceve dati già aggregati da [[Gestione_Pagamenti_e_Rinnovi]] e non esegue alcun
calcolo monetario: la conversione a `number` è confinata alla geometria SVG e ai
formatter.

Barre e non area: i punti sono totali discreti, e un'area interpolerebbe
visivamente valori inesistenti fra un punto e l'altro. Sul flusso di cassa
l'argomento è più forte, non più debole: fra un picco e l'altro il valore reale è
**zero**, e una rampa continua verso i 120 € di novembre suggerirebbe una spesa
progressiva che non avviene. I colori sono valori esadecimali e non classi
Tailwind, perché Recharts disegna SVG: vanno tenuti allineati a mano con
`tailwind.config.ts`.

#### Selettori e stato della vista
Due selettori segmentati indipendenti — **metrica** (competenza / cassa) e
**finestra** (30 giorni / 6 mesi / 1 anno) — vivono in un componente generico a
parte, per non trasformare il grafico nel file monolitico che la Regola 5 vieta.
Mobile-first: a tutta larghezza con i segmenti che si dividono lo spazio sotto
`sm:`, compatti e allineati a destra da lì in su.

Il server precalcola **tutte** le combinazioni, quindi cambiare vista è un
`useState` e non un round-trip: scegliere fra serie già aggregate non viola la
regola sulle aggregazioni server-side, ricalcolarle lo farebbe.

La vista a 30 giorni esiste solo per la cassa — una spesa normalizzata al giorno
non significa nulla — e in quel caso l'opzione "competenza" è disabilitata con una
spiegazione, non nascosta. La metrica scelta non viene sovrascritta ma derivata,
così tornando su una finestra mensile si ritrova la selezione precedente.

#### Consolidato e proiettato
Nella finestra annuale la serie attraversa il presente. Il passato consolidato si
distingue dal futuro proiettato con l'opacità delle barre più una linea
tratteggiata di riferimento etichettata "oggi"; il tooltip lo ripete a parole.

La distinzione si disegna **solo** se la serie contiene entrambe le parti:
attenuare tutte le barre, come accadrebbe nella vista a 30 giorni dove è tutto
futuro, non comunicherebbe niente.

La libreria non entra nel bundle iniziale. Il grafico è caricato con
`next/dynamic` e `ssr: false` da un wrapper client dedicato, che esiste solo
perché la pagina dashboard è un Server Component e in Next 14 `ssr: false` non è
consentito lì. Senza questo confine, i ~108 kB di Recharts peserebbero sul primo
caricamento di ogni visita alla dashboard: inaccettabile per una PWA mobile-first
(vedi [[App_Mobile_e_Offline_PWA]]).

Il placeholder di caricamento replica l'altezza esatta del grafico, così la
sostituzione non produce layout shift.

### Primitive
Empty state e skeleton, condivisi da tutte le viste.

---

## Pattern ricorrenti

Ogni componente interattivo segue lo stesso schema: `useTransition` per lo stato
pending, `router.refresh()` dopo la mutazione, toast di esito. Gli errori arrivano
come valore dalle Server Action, mai come eccezione.

---

## Lavori aperti

Il refactoring modulare e l'audit responsive dello sprint corrente insistono
proprio su questi componenti: isolare le sezioni complesse di elenco e dashboard,
risolvere gli overflow orizzontali, ottimizzare i padding sui viewport stretti.

---

## Collegato a
[[Motore_Regole_NextJS]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Condivisione_Spese_e_Gruppi]] · [[Lettura_Scontrini_OCR_Gemini]] · [[App_Mobile_e_Offline_PWA]]
