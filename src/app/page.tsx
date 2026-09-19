import { JobTracker } from "@/components/tracker/JobTracker";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <JobTracker />
    </main>
  );
}
