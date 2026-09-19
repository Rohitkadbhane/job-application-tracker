import { describeFollowUp, type FollowUpState } from "@/lib/followUp";
import { cn } from "@/lib/cn";
import { BellIcon } from "@/components/ui/Icons";

const TONE: Record<FollowUpState["kind"], string> = {
  overdue: "bg-danger/10 text-danger font-semibold",
  today: "bg-interview-soft text-interview-ink font-semibold",
  soon: "bg-ink/5 text-ink font-medium",
  upcoming: "text-muted font-medium",
};

/** Text always carries the meaning ("overdue by 2 days"); color only reinforces it. */
export function FollowUpBadge({ state, date }: { state: FollowUpState; date: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs",
        TONE[state.kind],
        state.kind === "upcoming" && "px-0",
      )}
    >
      <BellIcon className="size-3.5" />
      {describeFollowUp(state, date)}
    </span>
  );
}
