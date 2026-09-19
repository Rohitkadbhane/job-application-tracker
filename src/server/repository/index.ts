import { join } from "node:path";
import { FileApplicationRepository } from "./file-store";
import type { ApplicationRepository } from "./types";
import { UpstashApplicationRepository } from "./upstash-store";

export { StorageError } from "./types";
export type { ApplicationRepository } from "./types";

/**
 * Picks the storage driver from environment variables:
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  -> Redis (persistent, use in production)
 *   otherwise                                          -> local JSON file
 */
function createRepository(): ApplicationRepository {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    return new UpstashApplicationRepository(url.replace(/\/$/, ""), token);
  }

  // Serverless file systems are read-only except /tmp (which is not persistent).
  const fallbackPath = process.env.VERCEL
    ? "/tmp/jobline.json"
    : join(process.cwd(), "data", "applications.json");
  return new FileApplicationRepository(process.env.DATA_FILE ?? fallbackPath);
}

// Keep one instance across hot reloads in development so the write queue isn't duplicated.
const globalForRepo = globalThis as unknown as { __joblineRepo?: ApplicationRepository };

export function getRepository(): ApplicationRepository {
  globalForRepo.__joblineRepo ??= createRepository();
  return globalForRepo.__joblineRepo;
}
