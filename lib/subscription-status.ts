/**
 * Stato di attività di un abbonamento — helper puro (soft-delete, Sprint 8).
 *
 * `canceledAt` null = attivo. Il filtro **non** vive nelle query: il layer dati
 * legge attivi e cessati con un solo fetcher memoizzato, e la selezione avviene
 * qui, in memoria (decisione registrata in `docs/Soft_Delete_Abbonamenti.md`).
 *
 * ⚠️ Questo è l'unico punto in cui il filtro va scritto. Ripeterlo a mano nei
 * chiamanti significa, prima o poi, dimenticarlo in uno: e dimenticarlo non
 * produce un errore, produce un numero sbagliato — un abbonamento disdetto che
 * continua a pesare sul Burn Rate.
 *
 * Unica eccezione legittima al filtro: il trend di spesa, che ha bisogno anche
 * dei cessati per sapere in quali mesi contribuivano.
 */

/** Forma minima richiesta: disaccoppia l'helper dal model Prisma completo. */
export interface CancelableSubscription {
  canceledAt: Date | null;
}

/** Un abbonamento è attivo finché non ha una data di cessazione. */
export function isActive(sub: CancelableSubscription): boolean {
  return sub.canceledAt === null;
}

/** Solo gli abbonamenti attivi, preservando il tipo del chiamante. */
export function onlyActive<T extends CancelableSubscription>(subs: T[]): T[] {
  return subs.filter(isActive);
}

/**
 * L'abbonamento era attivo in un qualsiasi istante dell'intervallo `[from, to)`?
 *
 * Serve al trend storico: un abbonamento cessato a maggio ha contribuito ai mesi
 * fino a maggio compreso, e va contato in quelli. La cessazione è inclusiva sul
 * suo stesso mese, coerentemente col fatto che il costo di quel ciclo era già
 * stato sostenuto.
 */
export function wasActiveInPeriod(
  sub: CancelableSubscription & { createdAt: Date },
  from: Date,
  to: Date,
): boolean {
  if (sub.createdAt >= to) return false; // creato dopo la fine del periodo
  return sub.canceledAt === null || sub.canceledAt >= from;
}
