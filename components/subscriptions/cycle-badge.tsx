/**
 * Badge del ciclo di fatturazione (Mensile/Annuale). Server Component puro.
 */
export function CycleBadge({ cycle }: { cycle: string }) {
  const isMonthly = cycle === "MONTHLY";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isMonthly
          ? "border-subsync-cyan/30 bg-subsync-cyan/10 text-subsync-cyan"
          : "border-subsync-purple/30 bg-subsync-purple/10 text-subsync-purple"
      }`}
    >
      {isMonthly ? "Mensile" : "Annuale"}
    </span>
  );
}
