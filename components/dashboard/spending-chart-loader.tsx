"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { SpendingTrendDTO } from "@/types";

/**
 * Confine di code-splitting del grafico.
 *
 * Recharts pesa ~108 kB: caricarlo nel bundle iniziale della dashboard è
 * inaccettabile per una PWA mobile-first. `next/dynamic` con `ssr: false` lo
 * sposta in un chunk separato, richiesto solo dopo l'idratazione.
 *
 * Perché questo file esiste: `app/(dashboard)/page.tsx` è un Server Component, e
 * in Next 14 `ssr: false` non è consentito lì. Serve un confine client esplicito,
 * e questo wrapper è l'unica cosa che ci sta dentro.
 *
 * Il placeholder replica l'altezza esatta del grafico (`h-48 sm:h-56` più il
 * footer) così la sostituzione non produce layout shift.
 */
const SpendingChart = dynamic(
  () =>
    import("@/components/dashboard/spending-chart").then((m) => m.SpendingChart),
  {
    ssr: false,
    loading: () => (
      <div>
        <Skeleton className="h-48 w-full sm:h-56" />
        <div className="mt-4 flex items-baseline justify-between">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    ),
  },
);

export function SpendingChartLoader({ data }: { data: SpendingTrendDTO }) {
  return <SpendingChart data={data} />;
}
