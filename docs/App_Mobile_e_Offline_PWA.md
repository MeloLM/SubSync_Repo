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
Un banner dedicato, dismissibile, agganciato all'evento del browser che segnala la
possibilità di installare. Vive nel root layout, quindi è disponibile ovunque.

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
