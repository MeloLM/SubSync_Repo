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
