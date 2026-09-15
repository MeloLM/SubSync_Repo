# App Mobile e Offline (PWA)

Installabilità, comportamento offline e distribuzione dell'app come Progressive Web
App.

Nodo padre: [[Index]]

---

## Installabilità

### Manifest
Dichiara nome, nome breve, colore tema e modalità standalone, con icone a 192 e 512
più una maskable. Espone la route del manifest generata da Next.

### Meta e viewport
Impostati nel root layout: colore tema, meta specifici iOS e Android, viewport che
copre l'area sicura del notch.

### Prompt di installazione
Un banner dedicato, agganciato all'evento del browser che segnala la possibilità di
installare. Vive nel root layout, quindi è disponibile ovunque.

**Il rifiuto viene ricordato per trenta giorni.** Prima, chiudere il banner lo
nascondeva solo fino al ricaricamento della pagina: chi non voleva installare l'app
se lo ritrovava davanti a ogni visita. Vale come rifiuto anche il "no" dato alla
finestra nativa del browser, non solo la chiusura del banner — è la stessa
decisione dell'utente, presa un passo più avanti.

La scadenza è memorizzata come istante assoluto in `localStorage`, non come
contatore: un valore illeggibile o già scaduto viene ripulito e il banner torna a
mostrarsi.

⚠️ Due vincoli su quella lettura. Primo, avviene in `useEffect` e mai durante il
render: leggere `localStorage` nel corpo del componente produrrebbe un markup
diverso fra server e client, cioè un hydration mismatch. Secondo, ogni accesso è
protetto da `try/catch`, perché in finestra privata o con i dati del sito bloccati
il solo leggere la proprietà lancia — e un banner di installazione non è un buon
motivo per far esplodere la dashboard. Finché la lettura non è avvenuta il
componente non rende nulla, così il banner non lampeggia prima di sparire.

### Invito via QR
Una rotta dedicata mostra il QR del link di installazione, con copia negli appunti e
condivisione nativa dove il browser la supporta. È il canale pensato per far
installare l'app a qualcuno che ha il telefono in mano.

---

## Comportamento offline

Il service worker viene registrato al mount da un componente senza rendering.
Applica due strategie:

| Tipo di richiesta | Strategia |
| ----------------- | --------- |
| Asset statici e icone | Cache-first |
| Navigazioni | Network-first, con pagina di fallback offline |

---

## Il limite attuale

Le viste autenticate restano **fuori dalla cache**, e non per dimenticanza: sono
dinamiche e per-utente (vedi [[Motore_Regole_NextJS]]), quindi metterle in cache
richiede una strategia esplicita su cosa sia lecito conservare sul dispositivo.

In pratica: offline l'app si apre, ma non mostra il burn rate.

Il nodo aperto è [[Burn Rate Offline Cache]], da progettare insieme alle metriche
di [[Gestione_Pagamenti_e_Rinnovi]].

Resta da eseguire anche il [[Lighthouse Audit]] su build di produzione.

---

## Collegato a
[[Motore_Regole_NextJS]] · [[Interfaccia_Grafica_Dashboard]] · [[Gestione_Pagamenti_e_Rinnovi]]
