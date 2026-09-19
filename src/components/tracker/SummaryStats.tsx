import { cn } from "@/lib/cn";

export interface Summary {
  total: number;
  interviews: number;
  selected: number;
  followUpsDue: number;
}

interface StatProps {
  label: string;
  value: number | null;
  tone?: string;
  className?: string;
}

function Stat({ label, value, tone, className }: StatProps) {
  return (
    <div className={cn("min-w-0 border-l-2 border-line pl-4", className)}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("font-display text-4xl font-semibold tabular-nums leading-tight", tone)}>
        {value === null ? <span className="inline-block h-9 w-10 animate-pulse rounded bg-line align-middle" /> : value}
      </dd>
    </div>
  );
}

/** `summary` is null while loading so the layout doesn't jump when numbers arrive. */
export function SummaryStats({ summary }: { summary: Summary | null }) {
  const due = summary?.followUpsDue ?? 0;
  return (
    <dl aria-label="Summary" className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      <Stat label="Total applications" value={summary?.total ?? null} />
      <Stat label="Interviews" value={summary?.interviews ?? null} tone="text-interview-ink" />
      <Stat label="Selected" value={summary?.selected ?? null} tone="text-selected-ink" />
      <Stat
        label="Follow-ups due"
        value={summary?.followUpsDue ?? null}
        tone={due > 0 ? "text-danger" : undefined}
        className={due > 0 ? "border-danger" : undefined}
      />
    </dl>
  );
}
