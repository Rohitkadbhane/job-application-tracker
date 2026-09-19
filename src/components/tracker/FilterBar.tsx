import { STATUS_META } from "@/lib/constants";
import { STATUSES, type ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { BellIcon } from "@/components/ui/Icons";

export type StatusFilter = ApplicationStatus | "All";

interface FilterBarProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  followUpOnly: boolean;
  onFollowUpOnlyChange: (value: boolean) => void;
  counts: Record<StatusFilter, number>;
  followUpsDue: number;
  disabled?: boolean;
}

export function FilterBar({
  status,
  onStatusChange,
  followUpOnly,
  onFollowUpOnlyChange,
  counts,
  followUpsDue,
  disabled,
}: FilterBarProps) {
  const options: StatusFilter[] = ["All", ...STATUSES];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="group"
        aria-label="Filter by status"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {options.map((option) => {
          const active = status === option;
          const meta = option === "All" ? null : STATUS_META[option];
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onStatusChange(option)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line-strong bg-surface text-ink hover:border-ink",
              )}
            >
              {meta ? <span aria-hidden="true" className={cn("size-2 rounded-full", meta.dot)} /> : null}
              {option}
              <span className={cn("tabular-nums", active ? "text-white/75" : "text-muted")}>{counts[option]}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        aria-pressed={followUpOnly}
        onClick={() => onFollowUpOnlyChange(!followUpOnly)}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-full border px-3.5 text-sm font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          followUpOnly
            ? "border-danger bg-danger text-white"
            : "border-line-strong bg-surface text-ink hover:border-ink",
        )}
      >
        <BellIcon className="size-4" />
        Needs follow-up
        <span className={cn("tabular-nums", followUpOnly ? "text-white/80" : "text-muted")}>{followUpsDue}</span>
      </button>
    </div>
  );
}
