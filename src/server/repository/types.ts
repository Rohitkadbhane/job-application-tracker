import type { ApplicationPatch, JobApplication, NewApplication } from "@/lib/types";

/**
 * The only thing the rest of the app knows about storage.
 * Swap the implementation (JSON file, Redis, Postgres...) without touching route handlers.
 * Every method is scoped to a workspace so each visitor only ever sees their own data.
 */
export interface ApplicationRepository {
  /** Newest first. */
  list(workspaceId: string): Promise<JobApplication[]>;
  create(workspaceId: string, input: NewApplication): Promise<JobApplication>;
  /** Returns null when the application doesn't exist in this workspace. */
  update(workspaceId: string, id: string, patch: ApplicationPatch): Promise<JobApplication | null>;
  /** Returns false when the application doesn't exist in this workspace. */
  remove(workspaceId: string, id: string): Promise<boolean>;
}

/** Thrown when the storage backend itself fails (unreadable file, Redis down...). */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}
