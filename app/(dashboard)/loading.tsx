import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton della dashboard (KPI Burn Rate + prossimi rinnovi + trend). */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* KPI principale */}
        <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6 md:col-span-2">
          <Skeleton className="mb-4 h-5 w-44" />
          <Skeleton className="mb-3 h-12 w-56" />
          <Skeleton className="h-4 w-72" />
        </section>

        {/* Prossimi rinnovi */}
        <section className="rounded-2xl border border-zinc-800 bg-subsync-card p-6">
          <Skeleton className="mb-4 h-5 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </section>

        {/* Trend */}
        <section className="col-span-full rounded-2xl border border-zinc-800 bg-subsync-card p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </section>
      </div>
    </div>
  );
}
