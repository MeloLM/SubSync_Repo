# Soft-Delete Abbonamenti

**Stato: progettato, non implementato.** Prossimo obiettivo prioritario.

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

La conseguenza pratica: `getSubscriptionsByUser` non può restare un solo fetcher
indifferenziato. Serve separare la lettura degli **attivi** da quella che include
i **cessati**, perché il trend è l'unico consumatore che vuole i secondi.

⚠️ Attenzione alla memoizzazione: i fetcher sono avvolti in `React.cache` e
deduplicano per argomenti. Due fetcher distinti significano due query per render
sulla dashboard, dove oggi ce n'è una sola. Se il costo dà fastidio, l'alternativa
è un unico fetcher senza filtro e la selezione degli attivi in memoria — a patto
di documentarlo, perché sposta un filtro dal database al codice.

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

L'azione "Elimina" diventa **"Disattiva"**, con la possibilità di riattivare
(`canceledAt` di nuovo a `null`). Il dialog di conferma cambia messaggio: non si
sta più distruggendo un dato, si sta chiudendo un abbonamento.

Resta aperta una domanda di prodotto: se serva anche una cancellazione definitiva
per l'utente che ha inserito un record per errore e non vuole vederlo nello
storico. Dettagli UI in [[Interfaccia_Grafica_Dashboard]].

---

## Migrazione

Campo nullable, quindi la migrazione è additiva e non distruttiva: i record
esistenti restano attivi con `canceledAt` a `null`. Nessun backfill.

Sul rilascio va ricordato che `migrate deploy` non gira su Vercel
(vedi `AI_law_subsync.md`, Parte VI): è un passo consapevole e separato.

---

## Collegato a
[[Database_Tabelle_e_Modelli_Prisma]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Interfaccia_Grafica_Dashboard]] · [[Condivisione_Spese_e_Gruppi]]
