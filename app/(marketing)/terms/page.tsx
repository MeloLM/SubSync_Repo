import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini di Servizio — SubSync",
  description: "Termini e condizioni d'uso di SubSync.",
};

export default function TermsPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-zinc-300">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Termini e Condizioni di Servizio
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Ultimo aggiornamento: 21 Agosto 2026
        </p>
      </div>

      <p>
        Benvenuto in SubSync. Accedendo o utilizzando la nostra applicazione web,
        accetti di essere vincolato dai presenti Termini di Servizio. Se non
        accetti questi termini, ti preghiamo di non utilizzare
        l&apos;applicazione.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          1. Descrizione del Servizio
        </h2>
        <p>
          SubSync è uno strumento personale progettato per aiutare gli utenti a
          tracciare, gestire e monitorare le proprie spese per servizi in
          abbonamento. Il servizio include funzionalità di inserimento manuale e
          strumenti assistiti dall&apos;Intelligenza Artificiale (OCR) per
          l&apos;estrazione dei dati da file grafici.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          2. Account e Registrazione
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-600">
          <li>
            L&apos;accesso al servizio avviene tramite provider di terze parti
            (Google OAuth) oppure tramite registrazione diretta con indirizzo
            email e password.
          </li>
          <li>
            Sei responsabile di mantenere la riservatezza delle credenziali del
            tuo account.
          </li>
          <li>
            Ci riserviamo il diritto di sospendere o terminare gli account che
            mostrano attività sospette, abusi del sistema o violazioni di questi
            termini.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          3. Utilizzo dello Scanner IA
        </h2>
        <p>
          L&apos;applicazione fornisce uno scanner intelligente per le ricevute.
          Acconsenti al fatto che i risultati generati dall&apos;Intelligenza
          Artificiale sono forniti come supporto e potrebbero non essere esatti al
          100%. È tua esclusiva responsabilità verificare e confermare la
          correttezza dei dati (es. importi, date e valute) prima di salvare
          l&apos;abbonamento nel tuo database.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          4. Limitazione di Responsabilità
        </h2>
        <p>
          Il servizio è fornito &quot;così com&apos;è&quot; (as is) e &quot;come
          disponibile&quot;. SubSync e i suoi sviluppatori non offrono alcuna
          garanzia esplicita o implicita riguardo all&apos;affidabilità, alla
          disponibilità continua del servizio o all&apos;accuratezza dei dati
          elaborati. In nessun caso il titolare dell&apos;applicazione sarà
          ritenuto responsabile per eventuali danni diretti o indiretti derivanti
          dall&apos;utilizzo o dall&apos;impossibilità di utilizzare
          l&apos;applicazione.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          5. Modifiche al Servizio e ai Termini
        </h2>
        <p>
          Ci riserviamo il diritto di modificare o interrompere, temporaneamente o
          permanentemente, il servizio. Le modifiche ai presenti Termini saranno
          effettive nel momento in cui verranno pubblicate su questa pagina.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">6. Contatti</h2>
        <p>
          Per domande relative ai presenti Termini di Servizio, è possibile
          contattarci all&apos;indirizzo:{" "}
          <a
            href="mailto:xlr.otto@gmail.com"
            className="text-subsync-cyan transition-opacity hover:opacity-80"
          >
            xlr.otto@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
