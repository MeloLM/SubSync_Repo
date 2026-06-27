import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton della tabella abbonamenti. */
export default function SubscriptionsLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-7 w-44" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-48" />
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-subsync-card">
        <div className="border-b border-zinc-800 px-6 py-3">
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="divide-y divide-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
