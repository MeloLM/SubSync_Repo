import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton della timeline pagamenti. */
export default function PaymentsLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </header>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex flex-1 items-center justify-between rounded-2xl border border-zinc-800 bg-subsync-card p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
