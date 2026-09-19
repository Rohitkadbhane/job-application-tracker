import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { AlertIcon, PlusIcon, RefreshIcon } from "@/components/ui/Icons";

/** Loading, empty and error views. Each one tells the user what happened and what to do next. */

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading applications" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center justify-between gap-6 px-5 py-5">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-4 w-40 max-w-full rounded bg-line" />
            <div className="h-3 w-56 max-w-full rounded bg-line/70" />
          </div>
          <div className="hidden h-3 w-24 rounded bg-line/70 md:block" />
          <div className="h-8 w-28 rounded-full bg-line" />
        </div>
      ))}
      <span className="sr-only">Loading applications...</span>
    </div>
  );
}

function Message({
  illustration,
  title,
  children,
  actions,
}: {
  illustration: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {illustration}
      <h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-pretty text-muted">{children}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}

/** An empty line: the same visual language as the real stage track, with nothing on it yet. */
function EmptyLine() {
  return (
    <svg viewBox="0 0 120 24" className="h-6 w-28 text-line-strong" fill="none" aria-hidden="true">
      <path d="M12 12h96" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
      {[12, 60, 108].map((x) => (
        <circle key={x} cx={x} cy="12" r="5" fill="var(--color-surface)" stroke="currentColor" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Message
      illustration={<EmptyLine />}
      title="Your line is empty"
      actions={
        <Button onClick={onAdd} icon={<PlusIcon className="size-4" />}>
          Add your first application
        </Button>
      }
    >
      Add a job you&apos;ve applied for and watch it move from Applied to Interview to Selected.
    </Message>
  );
}

export function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <Message
      illustration={<EmptyLine />}
      title="Nothing matches these filters"
      actions={
        <Button variant="secondary" onClick={onClear}>
          Show all applications
        </Button>
      }
    >
      No applications fit the current status and reminder filters.
    </Message>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <Message
        illustration={
          <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertIcon className="size-6" />
          </span>
        }
        title="Couldn't load your applications"
        actions={
          <Button onClick={onRetry} icon={<RefreshIcon className="size-4" />}>
            Try again
          </Button>
        }
      >
        {message}
      </Message>
    </div>
  );
}
