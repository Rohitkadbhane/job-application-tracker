"use client";

import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { isFollowUpDue, todayISO } from "@/lib/followUp";
import type { ApplicationStatus, JobApplication, NewApplication } from "@/lib/types";
import { useApplications } from "@/hooks/useApplications";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { ApplicationFormModal } from "./ApplicationFormModal";
import { ApplicationRow } from "./ApplicationRow";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { FilterBar, type StatusFilter } from "./FilterBar";
import { EmptyState, ErrorState, ListSkeleton, NoResultsState } from "./StateViews";
import { SummaryStats, type Summary } from "./SummaryStats";

/** null = closed, "new" = add form, an application = edit form. */
type FormTarget = null | "new" | JobApplication;

const messageFrom = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

export function JobTracker() {
  const { items, loadState, loadError, pendingIds, reload, add, edit, changeStatus, remove } = useApplications();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);

  const isLoading = loadState === "loading";
  const today = todayISO();

  // Everything below is derived from `items`; nothing is duplicated into extra state.
  const { summary, counts, visible } = useMemo(() => {
    const counts: Record<StatusFilter, number> = { All: items.length, Applied: 0, Interview: 0, Rejected: 0, Selected: 0 };
    let followUpsDue = 0;
    for (const item of items) {
      counts[item.status] += 1;
      if (isFollowUpDue(item, today)) followUpsDue += 1;
    }

    let visible = items.filter(
      (item) =>
        (statusFilter === "All" || item.status === statusFilter) &&
        (!followUpOnly || isFollowUpDue(item, today)),
    );
    if (followUpOnly) {
      // Most overdue first.
      visible = [...visible].sort((a, b) => (a.followUpDate ?? "").localeCompare(b.followUpDate ?? ""));
    }

    const summary: Summary = {
      total: items.length,
      interviews: counts.Interview,
      selected: counts.Selected,
      followUpsDue,
    };
    return { summary, counts, visible };
  }, [items, statusFilter, followUpOnly, today]);

  const hasActiveFilter = statusFilter !== "All" || followUpOnly;
  const clearFilters = () => {
    setStatusFilter("All");
    setFollowUpOnly(false);
  };

  async function handleSubmit(values: NewApplication) {
    if (formTarget === null) return;
    if (formTarget === "new") {
      const created = await add(values);
      toast.success(`Added ${created.company}`);
    } else {
      const updated = await edit(formTarget.id, values);
      toast.success(`Saved changes to ${updated.company}`);
    }
    setFormTarget(null);
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const name = items.find((item) => item.id === id)?.company ?? "Application";
    try {
      await changeStatus(id, status);
      toast.success(`${name} moved to ${status}`);
    } catch (error) {
      toast.error(messageFrom(error, `Couldn't update ${name}. Nothing was changed.`));
    }
  }

  async function handleDelete(application: JobApplication) {
    setDeleteTarget(null);
    try {
      await remove(application.id);
      toast.success(`Deleted ${application.company}`);
    } catch (error) {
      toast.error(messageFrom(error, `Couldn't delete ${application.company}. It's still on your list.`));
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
            <path d="M7 16h18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="8" cy="16" r="3.2" fill="#fff" />
            <circle cx="16" cy="16" r="3.2" fill="var(--color-interview)" stroke="var(--color-brand)" strokeWidth="1.4" />
            <circle cx="24" cy="16" r="3.2" fill="#fff" />
          </svg>
          <span className="font-display text-xl font-bold tracking-tight">Jobline</span>
        </div>
        <Button onClick={() => setFormTarget("new")} icon={<PlusIcon className="size-4" />}>
          Add application
        </Button>
      </header>

      <section aria-labelledby="page-title" className="space-y-6">
        <h1 id="page-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Your applications
        </h1>
        <SummaryStats summary={isLoading || loadState === "error" ? null : summary} />
      </section>

      <section aria-label="Applications" className="space-y-4">
        <FilterBar
          status={statusFilter}
          onStatusChange={setStatusFilter}
          followUpOnly={followUpOnly}
          onFollowUpOnlyChange={setFollowUpOnly}
          counts={counts}
          followUpsDue={summary.followUpsDue}
          disabled={loadState !== "ready"}
        />

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {loadState === "loading" ? <ListSkeleton /> : null}
          {loadState === "error" ? (
            <ErrorState message={loadError ?? "Something went wrong."} onRetry={reload} />
          ) : null}
          {loadState === "ready" && items.length === 0 ? <EmptyState onAdd={() => setFormTarget("new")} /> : null}
          {loadState === "ready" && items.length > 0 && visible.length === 0 ? (
            <NoResultsState onClear={clearFilters} />
          ) : null}
          {loadState === "ready" && visible.length > 0 ? (
            <ul className="divide-y divide-line">
              {visible.map((application, index) => (
                <ApplicationRow
                  key={application.id}
                  application={application}
                  index={index}
                  today={today}
                  pending={pendingIds.has(application.id)}
                  onStatusChange={handleStatusChange}
                  onEdit={setFormTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </ul>
          ) : null}
        </div>

        {/* Announces filter results to screen readers without visual noise. */}
        <p className="sr-only" aria-live="polite">
          {loadState === "ready"
            ? `Showing ${visible.length} of ${items.length} applications${hasActiveFilter ? " with current filters" : ""}`
            : ""}
        </p>
        {loadState === "ready" && hasActiveFilter && visible.length > 0 ? (
          <p className="text-sm text-muted">
            Showing {visible.length} of {items.length}.{" "}
            <button type="button" onClick={clearFilters} className="font-medium text-brand underline underline-offset-2">
              Clear filters
            </button>
          </p>
        ) : null}
      </section>

      {formTarget !== null ? (
        <ApplicationFormModal
          application={formTarget === "new" ? null : formTarget}
          onSubmit={handleSubmit}
          onClose={() => setFormTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteModal
          application={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}
