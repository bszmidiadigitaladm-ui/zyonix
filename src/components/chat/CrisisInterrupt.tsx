import { CRISIS_RESOURCES } from "@/lib/safety/crisis-resources";

export function CrisisInterrupt({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <p className="mb-3">{message}</p>
      <ul className="flex flex-col gap-2">
        {CRISIS_RESOURCES.map((r) => (
          <li key={r.label}>
            <span className="font-semibold">{r.label}</span> — {r.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
