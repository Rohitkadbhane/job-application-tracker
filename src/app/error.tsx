"use client";

import { Button } from "@/components/ui/Button";

/** Catches unexpected rendering errors anywhere below the root layout. */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1 className="font-display text-3xl font-semibold">Jobline hit a snag</h1>
      <p className="text-muted">
        The page failed to load. Your saved applications are safe. Try again, and reload the page if it keeps happening.
      </p>
      {error.digest ? <p className="text-sm text-muted">Reference: {error.digest}</p> : null}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
