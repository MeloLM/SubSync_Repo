# Condivisione Spese e Gruppi

Condivisione di un abbonamento fra più persone: chi partecipa, quanto deve ciascuno,
chi ha già saldato. È l'unico dominio con due punti di vista distinti sullo stesso
dato.

Nodo padre: [[Index]]

---

## Modello

Ogni partecipante è una riga di `SubscriptionMember` (vedi [[Database_Tabelle_e_Modelli_Prisma]])
con email, stato dell'invito, peso della quota e flag di saldo.

Due scelte di modellazione da tenere presenti:

- **L'invito è per email, non per id utente.** Si può invitare qualcuno che non ha
  ancora un account: il collegamento avviene alla registrazione, grazie al trigger
  descritto in [[Auth_Utenti_e_Sessioni_Supabase]].
- **Il proprietario non è una riga.** È implicito, con peso 1. Non compare fra i
  membri ma entra nel calcolo delle quote.

---

## Ripartizione delle quote

Il calcolo parte dai pesi e delega l'aritmetica al modulo monetario condiviso.
La somma delle quote è **esatta al centesimo**: il resto della divisione viene
distribuito col metodo del resto maggiore, invece di essere arrotondato via.

Su un abbonamento da 10 euro diviso per tre, questo è ciò che separa 3,33 + 3,33 +
3,33 (che non fa 10) da una ripartizione che torna.

---

## I due punti di vista

### Proprietario
Sulla pagina di split del singolo abbonamento: invita per email, regola i pesi,
segna chi ha saldato, rimuove partecipanti.

### Invitato
Sulla pagina dei condivisi: accetta o rifiuta gli inviti ricevuti e vede gli
abbonamenti in cui è coinvolto.

### Punto di incontro
Il conteggio degli inviti pendenti alimenta il badge nella navigazione, risolto dal
layout dell'area applicativa: è il modo in cui l'invitato si accorge dell'invito
senza cercarlo. Vedi [[Interfaccia_Grafica_Dashboard]].

---

## Esiti delle mutazioni

Invitare, regolare la quota, segnare il saldo, rimuovere e rispondere a un invito
restituiscono un `ActionResult` senza payload. Sono errori **attesi**, quindi valori e non
eccezioni: email vuota, non valida o propria, quota non numerica o non positiva, abbonamento
non trovato o disattivato, email già invitata (anche per due richieste concorrenti,
intercettate dal vincolo di unicità), membro o invito inesistente o altrui, invito già
gestito. Convenzione in [[Motore_Regole_NextJS]].

### Validazione dell'input
Ogni mutazione passa da uno schema zod prima di leggere il database
(`lib/validation/`, convenzione in [[Motore_Regole_NextJS]]):

- **email**: tagliata, in minuscolo, di forma valida e non oltre 254 caratteri;
  è la chiave dell'invito, quindi la normalizzazione è parte della regola;
- **quota** (`shareWeight`): maggiore di zero e al massimo 100, fino a quattro
  decimali; resta una stringa fino a `money()` (Regola 1), omessa vale 1;
- **identificativi** di abbonamento e membro: non vuoti e di lunghezza sana;
- **risposta all'invito**: un booleano, non un valore troppo permissivo.

Restano nell'action le regole che dipendono dall'utente o dal database: non invitare
se stessi, abbonamento proprio e attivo, invito duplicato.

---

## Flusso di un invito

```
proprietario invita per email
        ↓
  membro in stato PENDING
        ↓
invitato vede l'invito su /shared  ──> rifiuta ──> fine
        ↓ accetta
  membro attivo, entra nel calcolo delle quote
        ↓
proprietario segna il saldo quando riceve il pagamento
```

---

## Collegato a
[[Database_Tabelle_e_Modelli_Prisma]] · [[Auth_Utenti_e_Sessioni_Supabase]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Interfaccia_Grafica_Dashboard]]
