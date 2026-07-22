import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SubSync",
  description: "Informativa sulla privacy di SubSync.",
};

/**
 * ⚠️ PLACEHOLDER — sostituire il testo "Lorem ipsum" con l'informativa privacy
 * definitiva prima della pubblicazione (richiesta per l'approvazione OAuth Google).
 */
export default function PrivacyPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-zinc-300">
      <div>
        <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Ultimo aggiornamento: [DATA] — bozza segnaposto, sostituire col testo
          definitivo.
        </p>
      </div>

      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">1. Dati che raccogliamo</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute
          irure dolor in reprehenderit in voluptate velit esse cillum dolore.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">2. Come usiamo i dati</h2>
        <p>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
          officia deserunt mollit anim id est laborum.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">3. Conservazione e diritti</h2>
        <p>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">4. Contatti</h2>
        <p>
          Per domande sulla presente informativa: [email di contatto].
        </p>
      </section>
    </article>
  );
}
