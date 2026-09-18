import { cn } from "@/lib/utils";

// Small presentational helpers shared by the admin pages. The admin panel is an
// internal tool, so its copy is English-only and not routed through next-intl.

export function fmtDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const BADGE_TONES = {
  neutral: "border-border bg-surface text-muted",
  good: "border-accent/40 bg-accent-soft/60 text-accent",
  warn: "border-warning/40 bg-warning/10 text-warning",
  bad: "border-danger/40 bg-danger/10 text-danger",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

export function statusTone(status: string | null | undefined): keyof typeof BADGE_TONES {
  if (status === "active" || status === "trialing") return "good";
  if (status === "past_due" || status === "unpaid") return "warn";
  if (status === "canceled") return "bad";
  return "neutral";
}

export function AdminTable({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-surface-raised/60 text-xs text-muted uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {!hasRows && <p className="px-4 py-8 text-center text-sm text-muted">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm break-all">{children}</dd>
    </div>
  );
}
