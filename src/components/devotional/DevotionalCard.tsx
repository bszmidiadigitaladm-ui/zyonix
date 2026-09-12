import type { Devotional } from "@/lib/types/database.types";

export function DevotionalCard({ devotional }: { devotional: Devotional }) {
  return (
    <article className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <p className="mb-1 text-xs text-neutral-500">
        {new Date(devotional.publish_date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h2 className="mb-3 text-xl font-semibold">{devotional.title}</h2>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {devotional.body}
      </div>
      {devotional.scripture_reference && (
        <p className="mt-4 text-sm font-medium italic text-neutral-500">
          {devotional.scripture_reference}
        </p>
      )}
    </article>
  );
}
