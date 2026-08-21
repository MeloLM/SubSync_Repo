import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SubSync",
  description: "Informativa sulla privacy di SubSync.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-zinc-300">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Informativa sulla Privacy di SubSync
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Ultimo aggiornamento: 21 Agosto 2026
        </p>
      </div>

      <p>
        La presente Informativa descrive come SubSync (sviluppato da Carmelo)
        raccoglie, utilizza e protegge i dati personali degli utenti. Utilizzando
        l&apos;applicazione, l&apos;utente accetta le pratiche descritte in questo
        documento.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">1. Dati raccolti</h2>
        <p>
          Raccogliamo esclusivamente i dati strettamente necessari per il
          funzionamento del servizio:
        </p>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-600">
          <li>
            <strong className="font-medium text-zinc-100">
              Dati di Autenticazione:
            </strong>{" "}
            se accedi tramite Google OAuth, riceviamo il tuo indirizzo email, il
            tuo nome pubblico e l&apos;ID univoco associato al tuo account
            Google. Se invece scegli la registrazione diretta, raccogliamo
            l&apos;indirizzo email e la password che fornisci. In nessuno dei due
            casi abbiamo accesso alla tua password in chiaro: le credenziali sono
            gestite e conservate in forma cifrata dal nostro provider di
            autenticazione (Supabase).
          </li>
          <li>
            <strong className="font-medium text-zinc-100">
              Dati Inseriti dall&apos;Utente:
            </strong>{" "}
            raccogliamo le informazioni che decidi di inserire nell&apos;app, come
            i dettagli dei tuoi abbonamenti (nome, costo, ciclo di fatturazione).
          </li>
          <li>
            <strong className="font-medium text-zinc-100">
              Immagini delle Ricevute:
            </strong>{" "}
            se utilizzi lo scanner IA integrato, raccogliamo temporaneamente le
            immagini caricate per estrarne i dati fiscali.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          2. Come utilizziamo i dati
        </h2>
        <p>
          I dati raccolti vengono utilizzati esclusivamente per i seguenti scopi:
        </p>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-600">
          <li>
            Fornire, mantenere e migliorare le funzionalità principali di SubSync.
          </li>
          <li>
            Sincronizzare i tuoi abbonamenti in modo sicuro tramite il nostro
            database cloud.
          </li>
          <li>
            Elaborare le ricevute caricate tramite Intelligenza Artificiale per
            compilare automaticamente i campi dei moduli.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          3. Servizi di terze parti e Intelligenza Artificiale
        </h2>
        <p>
          Per fornire il servizio, ci affidiamo a infrastrutture esterne sicure:
        </p>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-600">
          <li>
            <strong className="font-medium text-zinc-100">
              Database e Autenticazione:
            </strong>{" "}
            i tuoi dati sono archiviati in modo sicuro sui server cloud di
            Supabase.
          </li>
          <li>
            <strong className="font-medium text-zinc-100">
              Elaborazione IA (Scanner Ricevute):
            </strong>{" "}
            le immagini caricate vengono processate tramite le API di Google
            Gemini. Le immagini vengono analizzate in tempo reale solo per
            l&apos;estrazione dei dati. Conformemente alle policy dei fornitori
            cloud aziendali, i tuoi file privati non vengono utilizzati per
            addestrare modelli linguistici pubblici.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          4. Conservazione e Sicurezza
        </h2>
        <p>
          Adottiamo misure tecniche per proteggere i tuoi dati. Le informazioni
          vengono conservate per tutto il tempo in cui il tuo account rimane
          attivo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">5. I tuoi diritti</h2>
        <p>
          Hai il diritto di accedere ai tuoi dati, chiederne la modifica o
          richiederne la cancellazione definitiva. Per esercitare questi diritti o
          per qualsiasi domanda sulla privacy, puoi contattare lo sviluppatore
          all&apos;indirizzo email:{" "}
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
