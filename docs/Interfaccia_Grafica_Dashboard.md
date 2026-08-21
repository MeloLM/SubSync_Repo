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

Barre e non area: i punti sono totali mensili discreti, e un'area interpolerebbe
visivamente valori inesistenti fra un mese e l'altro. I colori sono valori
esadecimali e non classi Tailwind, perché Recharts disegna SVG: vanno tenuti
allineati a mano con `tailwind.config.ts`.

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
