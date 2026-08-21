# Calcolo IVA e Fisco

Deducibilità e detraibilità per chi ha Partita IVA: quanto di un abbonamento è
davvero un costo aziendale e quanta IVA si recupera.

**Stato: incompleto.** Il calcolo esiste ed è corretto, ma non è collegato a nulla.
Questa nota descrive sia ciò che c'è sia ciò che manca.

Nodo padre: [[Index]]

---

## Cosa esiste

### Attributi fiscali sull'abbonamento
Lo schema (vedi [[Database_Tabelle_e_Modelli_Prisma]]) porta già su ogni `Subscription`:

| Attributo | Significato |
| --------- | ----------- |
| natura della spesa | personale, aziendale o mista |
| importo lordo | se il valore inserito include l'IVA |
| aliquota IVA | percentuale applicata |
| deducibilità del costo | percentuale del costo scaricabile |
| detraibilità dell'IVA | percentuale di IVA recuperabile |
| tipo di documento | fattura, ricevuta, nessuno |

Il form di [[Gestione_Pagamenti_e_Rinnovi]] scrive già questi campi, e
[[Lettura_Scontrini_OCR_Gemini]] prova a dedurre aliquota, lordo e tipo documento dalla
ricevuta.

### Motore di calcolo
Un modulo helper puro produce lo scorporo completo: aliquota effettiva per regime
IVA, imponibile, IVA, quota di costo deducibile e quota di IVA detraibile, più la
serializzazione in DTO per la UI. Tutto in `Decimal`, coerente con le regole di
[[Database_Tabelle_e_Modelli_Prisma]].

### Categorie di spesa
Il model `ExpenseCategory` esiste con i suoi default fiscali suggeriti, pensato per
non richiedere all'utente di reinserire aliquota e percentuali a ogni abbonamento.

---

## Cosa manca

Il motore di calcolo **non è importato da nessun file**. Nel grafo è un ramo che
parte e si interrompe. Per chiudere la feature servono tre nodi:

- [[Fiscal Breakdown View]] — richiamare il calcolo dalle Server Action ed esporne
  il risultato nella UI di abbonamento e dashboard
- [[Expense Category Actions]] — CRUD delle categorie e applicazione dei default
  al form
- [[Currency Normalizer]] — precondizione per aggregare correttamente abbonamenti
  in valute diverse

---

## Approfondimento
[[sprint-7-fiscalita]] — analisi di dominio e scelte di modellazione alla base di
questi campi.

---

## Collegato a
[[Database_Tabelle_e_Modelli_Prisma]] · [[Gestione_Pagamenti_e_Rinnovi]] · [[Lettura_Scontrini_OCR_Gemini]]
