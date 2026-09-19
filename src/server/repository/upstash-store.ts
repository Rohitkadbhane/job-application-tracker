import { randomUUID } from "node:crypto";
import type { ApplicationPatch, JobApplication, NewApplication } from "@/lib/types";
import { StorageError, type ApplicationRepository } from "./types";

/** Anonymous workspaces expire after 90 days without a write, so the database self-cleans. */
const TTL_SECONDS = 60 * 60 * 24 * 90;

type Command = Array<string | number>;
type PipelineEntry = { result?: unknown; error?: string };

/**
 * Persistent storage on Upstash Redis via its REST API (plain `fetch`, no SDK).
 *
 * Data model: one Redis hash per workspace.
 *   key   = jobline:apps:<workspaceId>
 *   field = application id
 *   value = JSON of the application
 * Hash fields make create / update / delete single atomic commands, so two
 * tabs editing different applications never overwrite each other.
 */
export class UpstashApplicationRepository implements ApplicationRepository {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async list(workspaceId: string): Promise<JobApplication[]> {
    const [entry] = await this.pipeline([["HGETALL", key(workspaceId)]]);
    const values = hashValues(entry?.result);
    const items = values.flatMap((raw) => {
      try {
        return [JSON.parse(raw) as JobApplication];
      } catch {
        return []; // Skip a single corrupted record rather than failing the whole list.
      }
    });
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(workspaceId: string, input: NewApplication): Promise<JobApplication> {
    const now = new Date().toISOString();
    const created: JobApplication = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    await this.save(workspaceId, created);
    return created;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: ApplicationPatch,
  ): Promise<JobApplication | null> {
    const [entry] = await this.pipeline([["HGET", key(workspaceId), id]]);
    if (typeof entry?.result !== "string") return null;

    let current: JobApplication;
    try {
      current = JSON.parse(entry.result) as JobApplication;
    } catch {
      throw new StorageError("Stored application is corrupted");
    }
    const updated: JobApplication = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await this.save(workspaceId, updated);
    return updated;
  }

  async remove(workspaceId: string, id: string): Promise<boolean> {
    const [entry] = await this.pipeline([["HDEL", key(workspaceId), id]]);
    return Number(entry?.result) > 0;
  }

  private async save(workspaceId: string, application: JobApplication): Promise<void> {
    await this.pipeline([
      ["HSET", key(workspaceId), application.id, JSON.stringify(application)],
      ["EXPIRE", key(workspaceId), TTL_SECONDS],
    ]);
  }

  private async pipeline(commands: Command[]): Promise<PipelineEntry[]> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
        cache: "no-store",
      });
    } catch (error) {
      throw new StorageError("Could not reach the database", { cause: error });
    }
    if (!response.ok) {
      throw new StorageError(`Database request failed with status ${response.status}`);
    }
    const entries = (await response.json()) as PipelineEntry[];
    const failed = entries.find((entry) => entry.error);
    if (failed) throw new StorageError(`Database error: ${failed.error}`);
    return entries;
  }
}

const key = (workspaceId: string) => `jobline:apps:${workspaceId}`;

/** HGETALL comes back as a flat [field, value, field, value...] array (or an object in some setups). */
function hashValues(result: unknown): string[] {
  if (Array.isArray(result)) {
    return result.filter((_, index) => index % 2 === 1).map(String);
  }
  if (result && typeof result === "object") {
    return Object.values(result as Record<string, unknown>).map(String);
  }
  return [];
}
