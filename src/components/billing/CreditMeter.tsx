export function CreditMeter({
  label,
  remaining,
  total,
}: {
  label: string;
  remaining: number;
  total: number;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
        <span className="font-medium">
          {remaining} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
