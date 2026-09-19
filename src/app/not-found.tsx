import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="text-muted">That page isn&apos;t on the line. Head back to your applications.</p>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-hover"
      >
        Back to applications
      </Link>
    </main>
  );
}
