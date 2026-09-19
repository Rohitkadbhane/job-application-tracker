"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, applicationsApi } from "@/lib/api-client";
import type { ApplicationPatch, ApplicationStatus, JobApplication, NewApplication } from "@/lib/types";

export type LoadState = "loading" | "ready" | "error";

const newestFirst = (a: JobApplication, b: JobApplication) => b.createdAt.localeCompare(a.createdAt);

/**
 * All server-state logic for the tracker lives here, so components stay presentational.
 *
 * - add / edit are pessimistic: wait for the server, then update the list.
 * - changeStatus / remove are optimistic: the UI reacts instantly and rolls back
 *   (then rethrows so the caller can show a message) if the server refuses.
 */
export function useApplications() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    // Ignore responses that arrive after a newer load was started (e.g. rapid retries).
    const seq = ++requestSeq.current;
    setLoadState("loading");
    setLoadError(null);
    try {
      const data = await applicationsApi.list();
      if (seq !== requestSeq.current) return;
      setItems(data);
      setLoadState("ready");
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setLoadError(error instanceof ApiError ? error.message : "Could not load your applications.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount: subscribing to an external system (the API) is what effects are for.
    void load();
  }, [load]);

  const setPending = (id: string, isPending: boolean) =>
    setPendingIds((current) => {
      const next = new Set(current);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });

  const add = useCallback(async (input: NewApplication) => {
    const created = await applicationsApi.create(input);
    setItems((current) => [created, ...current]);
    return created;
  }, []);

  const edit = useCallback(async (id: string, patch: ApplicationPatch) => {
    try {
      const updated = await applicationsApi.update(id, patch);
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setItems((current) => current.filter((item) => item.id !== id));
      }
      throw error;
    }
  }, []);

  const changeStatus = useCallback(
    async (id: string, status: ApplicationStatus) => {
      const previous = items.find((item) => item.id === id);
      if (!previous || previous.status === status) return;

      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      setPending(id, true);
      try {
        const updated = await applicationsApi.update(id, { status });
        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      } catch (error) {
        setItems((current) =>
          error instanceof ApiError && error.status === 404
            ? current.filter((item) => item.id !== id) // Deleted elsewhere; don't resurrect it.
            : current.map((item) => (item.id === id ? previous : item)),
        );
        throw error;
      } finally {
        setPending(id, false);
      }
    },
    [items],
  );

  const remove = useCallback(
    async (id: string) => {
      const previous = items.find((item) => item.id === id);
      if (!previous) return;

      setItems((current) => current.filter((item) => item.id !== id));
      try {
        await applicationsApi.remove(id);
      } catch (error) {
        // Already gone on the server counts as success: the end state is what the user wanted.
        if (error instanceof ApiError && error.status === 404) return;
        setItems((current) => [...current, previous].sort(newestFirst));
        throw error;
      }
    },
    [items],
  );

  return { items, loadState, loadError, pendingIds, reload: load, add, edit, changeStatus, remove };
}
