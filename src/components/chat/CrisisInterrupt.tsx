import { CRISIS_RESOURCES } from "@/lib/safety/crisis-resources";

export function CrisisInterrupt({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-danger/40 bg-danger/10 p-4 text-sm text-foreground"
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
