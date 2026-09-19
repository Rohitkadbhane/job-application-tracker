import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ApplicationPatch, JobApplication, NewApplication } from "@/lib/types";
import { StorageError, type ApplicationRepository } from "./types";

type Database = Record<string, JobApplication[]>;

/**
 * Zero-setup JSON file storage, keyed by workspace.
 *
 * - Writes are queued (one at a time) so two simultaneous requests can't
 *   overwrite each other's changes.
 * - Each write goes to a temp file first and is then renamed, so a crash
 *   mid-write can never leave a half-written database behind.
 *
 * Trade-off: this is per-process. It is perfect for local development and a
 * single server, but not for serverless (each instance has its own disk).
 */
export class FileApplicationRepository implements ApplicationRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  list(workspaceId: string): Promise<JobApplication[]> {
    return this.enqueue(async () => {
      const db = await this.read();
      return sortNewestFirst(db[workspaceId] ?? []);
    });
  }

  create(workspaceId: string, input: NewApplication): Promise<JobApplication> {
    return this.enqueue(async () => {
      const db = await this.read();
      const now = new Date().toISOString();
      const created: JobApplication = {
        id: randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      db[workspaceId] = [created, ...(db[workspaceId] ?? [])];
      await this.write(db);
      return created;
    });
  }

  update(workspaceId: string, id: string, patch: ApplicationPatch): Promise<JobApplication | null> {
    return this.enqueue(async () => {
      const db = await this.read();
      const items = db[workspaceId] ?? [];
      const index = items.findIndex((item) => item.id === id);
      const current = items[index];
      if (!current) return null;

      const updated: JobApplication = { ...current, ...patch, updatedAt: new Date().toISOString() };
      items[index] = updated;
      db[workspaceId] = items;
      await this.write(db);
      return updated;
    });
  }

  remove(workspaceId: string, id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const db = await this.read();
      const items = db[workspaceId] ?? [];
      const remaining = items.filter((item) => item.id !== id);
      if (remaining.length === items.length) return false;
      db[workspaceId] = remaining;
      await this.write(db);
      return true;
    });
  }

  /** Run tasks strictly one after another; a failed task doesn't block the next one. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async read(): Promise<Database> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw new StorageError("Could not read the data file", { cause: error });
    }
    if (raw.trim() === "") return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Unexpected data shape");
      }
      return parsed as Database;
    } catch (error) {
      throw new StorageError("The data file is corrupted", { cause: error });
    }
  }

  private async write(db: Database): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
      await rename(tmp, this.filePath);
    } catch (error) {
      throw new StorageError("Could not write the data file", { cause: error });
    }
  }
}

function sortNewestFirst(items: JobApplication[]): JobApplication[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
