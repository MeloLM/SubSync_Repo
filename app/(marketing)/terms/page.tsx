import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini di Servizio — SubSync",
  description: "Termini e condizioni d'uso di SubSync.",
};

/**
 * ⚠️ PLACEHOLDER — sostituire il testo "Lorem ipsum" con i Termini di Servizio
 * definitivi prima della pubblicazione.
 */
export default function TermsPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-zinc-300">
      <div>
        <h1 className="text-2xl font-bold text-white">Termini di Servizio</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Ultimo aggiornamento: [DATA] — bozza segnaposto, sostituire col testo
          definitivo.
        </p>
      </div>

      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">1. Accettazione dei termini</h2>
        <p>
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
          nisi ut aliquip ex ea commodo consequat.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">2. Uso del servizio</h2>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">3. Limitazioni di responsabilità</h2>
        <p>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">4. Modifiche ai termini</h2>
        <p>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
          fugit.
        </p>
      </section>
    </article>
  );
}
