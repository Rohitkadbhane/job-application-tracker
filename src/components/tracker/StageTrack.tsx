import { PIPELINE_STAGES, STATUS_META } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * The signature element: an application's progress drawn as a line with stops.
 *
 *   Applied ●────○────○  Selected     (in progress: filled up to the current stop)
 *   Applied ●────●────●               (selected: the whole line is complete)
 *   Applied ●- - -✕                   (rejected: the line ends early)
 *
 * It's decorative: the status dropdown next to it is the accessible control.
 */
export function StageTrack({ status, index = 0 }: { status: ApplicationStatus; index?: number }) {
  if (status === "Rejected") return <RejectedTrack index={index} />;

  const current = PIPELINE_STAGES.indexOf(status);
  const color = STATUS_META[status].color;
  // Only the first few rows get a staggered delay so long lists don't feel slow.
  const delay = `${Math.min(index, 8) * 45}ms`;

  return (
    <div className="flex items-center" aria-hidden="true">
      {PIPELINE_STAGES.map((stage, stopIndex) => {
        const reached = stopIndex <= current;
        return (
          <div key={stage} className="flex items-center">
            {stopIndex > 0 ? (
              <span className="relative h-0.5 w-7 overflow-hidden rounded-full bg-line sm:w-9">
                <span
                  className="absolute inset-0 origin-left animate-track-draw transition-transform duration-500"
                  style={{
                    backgroundColor: color,
                    transform: `scaleX(${stopIndex <= current ? 1 : 0})`,
                    animationDelay: delay,
                  }}
                />
              </span>
            ) : null}
            <span
              className={cn(
                "size-3 rounded-full border-2 transition-colors duration-500",
                reached ? "" : "border-line-strong bg-surface",
              )}
              style={reached ? { backgroundColor: color, borderColor: color } : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function RejectedTrack({ index }: { index: number }) {
  const color = STATUS_META.Rejected.color;
  return (
    <div className="flex items-center" aria-hidden="true">
      <span className="size-3 rounded-full border-2" style={{ backgroundColor: color, borderColor: color }} />
      <span
        className="h-0 w-7 animate-track-draw border-t-2 border-dashed sm:w-9"
        style={{ borderColor: color, animationDelay: `${Math.min(index, 8) * 45}ms` }}
      />
      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
        <path d="M2 2l8 8M10 2 2 10" />
      </svg>
    </div>
  );
}
