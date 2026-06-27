/**
 * Skeleton primitive — placeholder animato durante il caricamento.
 * Usato nei file `loading.tsx` (Suspense a livello di route) per evitare
 * layout shift e dare feedback immediato sulle metriche/liste.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800 ${className}`}
      aria-hidden="true"
    />
  );
}
