# Soft-Delete Abbonamenti

**Stato: implementato.** Il campo `canceledAt` esiste sul
database dal 21 agosto 2026 (migrazione `add_canceled_at`) e la logica applicativa
lo usa. Resta aperta solo la UI di riattivazione.

Introduce una data di cessazione su `Subscription` al posto della cancellazione
fisica, così disattivare un abbonamento smette di distruggere lo storico.

Nodo padre: [[Index]]

---

## Il problema

Oggi `deleteSubscription` esegue una `DELETE`. Il record sparisce, e con lui
sparisce il passato: i `PaymentLog` collegati cadono per `onDelete: Cascade`, e
la serie del trend a 6 mesi si riscrive come se quell'abbonamento non fosse mai
esistito.

L'effetto è controintuitivo e visibile. Se disdici oggi un servizio attivo da
marzo, il grafico di [[Gestione_Pagamenti_e_Rinnovi]] non mostra una spesa che
cala: mostra sei mesi in cui quella spesa non c'è mai stata. La serie storica è
quindi **non decrescente per costruzione**, e non perché la spesa non sia mai
diminuita.

Finché il dato storico non è preservato, ogni analisi di andamento è inattendibile.

---

## Il modello

Un solo campo nuovo su `Subscription` (vedi [[Database_Tabelle_e_Modelli_Prisma]]):

| Campo | Tipo | Semantica |
| ----- | ---- | --------- |
| `canceledAt` | `DateTime?` | `null` = attivo; valorizzato = cessato a quella data |

Come ogni data del progetto va normalizzata a **00:00:00 UTC** prima del
salvataggio (Regola 2), perché entra in confronti di appartenenza al mese.

### Perché una data e non un booleano
Un flag `isActive` direbbe *se* è cessato, non *quando*. Il trend storico ha
bisogno del quando: serve a stabilire in quali mesi l'abbonamento contribuiva
al costo. Un booleano riporterebbe al problema di partenza.

---

## Impatto sulle query Prisma

È il punto delicato: **ogni lettura esistente diventa ambigua** e va decisa una
per una. Le letture vivono in `lib/data/`, quindi il cambiamento è concentrato lì.

| Consumatore | Filtro corretto | Perché |
| ----------- | --------------- | ------ |
| Lista abbonamenti, prossimi rinnovi | `canceledAt: null` | L'utente gestisce ciò che paga adesso |
| Monthly Burn Rate | `canceledAt: null` | È il costo corrente: un abbonamento disdetto non pesa più |
| Trend di spesa | **nessun filtro** | Ha bisogno anche dei cessati, per sapere quando contribuivano |
| Cron rinnovi | `canceledAt: null` | Non deve rinnovare né loggare pagamenti su un abbonamento chiuso |
| Split-Billing | `canceledAt: null` | Non si invita su un abbonamento che non esiste più |

### Decisione presa: fetcher unico

`getSubscriptionsByUser` **resta un fetcher solo e senza filtro**: legge attivi e
cessati, e la selezione degli attivi avviene **in memoria** nel consumatore.

La motivazione è di scala. I fetcher sono avvolti in `React.cache` e deduplicano
per argomenti: due fetcher distinti — uno filtrato, uno no — significherebbero due
query per render sulla dashboard, dove oggi ce n'è una sola. Per un SaaS personale,
dove il volume di abbonamenti per utente è irrisorio, una query in più pesa più
del filtro risparmiato.

⚠️ La contropartita va tenuta presente: **il filtro si sposta dal database al
codice**. Ogni consumatore deve ricordarsi di applicarlo, e dimenticarsene non
produce un errore ma un numero sbagliato — un abbonamento disdetto che continua a
pesare sul Burn Rate. Conviene che il filtro viva in un unico punto riusabile,
non ripetuto in ogni chiamante.

Se un giorno il volume dovesse crescere, la strada alternativa è separare i due
fetcher e riportare il filtro sul database, con un indice su `(userId, canceledAt)`.

---

## Impatto sul trend

`computeNormalizedTrend` oggi include un abbonamento nel mese M se
`createdAt < inizio di M+1`. Con la cessazione la condizione diventa un
**intervallo**: l'abbonamento contribuisce a M se esisteva in un qualsiasi
istante di quel mese, cioè

```
createdAt < inizio(M+1)  E  (canceledAt è null  OPPURE  canceledAt >= inizio(M))
```

Da quel momento la serie può finalmente **scendere**, ed è il segnale che rende
utile il grafico: si vede l'effetto di una disdetta.

L'helper è puro e già testato, quindi il cambiamento è coperto da test senza
toccare il database.

---

## Impatto sulla UI

L'azione "Elimina" è diventata **"Disattiva"**: icona `PowerOff` al posto del
cestino, e il dialog di conferma non parla più di rimozione definitiva ma spiega
cosa succede davvero — l'abbonamento smette di contare nel Burn Rate e sparisce
dalla lista, mentre lo storico resta e continua a comparire nel grafico.

Il componente si chiama ora `cancel-subscription-button.tsx`: tenere il nome
`delete` su un bottone che non cancella sarebbe stata una trappola per chi legge
il codice fra sei mesi.

⚠️ **Lacuna aperta.** La Server Action `reactivateSubscription` esiste, ma nessuna
schermata la invoca: un abbonamento disattivato sparisce dalla lista e non c'è
modo di riportarlo indietro dall'interfaccia. Serve una vista degli abbonamenti
cessati, o un filtro sulla lista esistente. Vedi
[[Interfaccia_Grafica_Dashboard]].

Resta aperta una domanda di prodotto: se serva anche una cancellazione definitiva
per l'utente che ha inserito un record per errore e non vuole vederlo nello
storico.

---

## Migrazione

Campo nullable, quindi la migrazione è additiva e non distruttiva: i record
esistenti restano attivi con `canceledAt` a `null`. Nessun backfill.

Sul rilascio va ricordato che `migrate deploy` non gira su Vercel
(vedi `AI_law_subsync.md`, Parte VI): è un passo consapevole e separato.

---

## Collegato a
[[Database_Tabelle_e_Modelli_Prisma]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Interfaccia_Grafica_Dashboard]] · [[Condivisione_Spese_e_Gruppi]]
