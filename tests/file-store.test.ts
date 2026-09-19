import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileApplicationRepository } from "@/server/repository/file-store";
import { StorageError } from "@/server/repository/types";

let dir: string;
let file: string;
let repo: FileApplicationRepository;

const sample = { company: "Acme", role: "Engineer", status: "Applied" as const, followUpDate: null };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "jobline-"));
  file = join(dir, "nested", "db.json");
  repo = new FileApplicationRepository(file);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileApplicationRepository", () => {
  it("starts empty when the file doesn't exist", async () => {
    expect(await repo.list("ws1")).toEqual([]);
  });

  it("creates, lists (newest first), updates and removes", async () => {
    const a = await repo.create("ws1", { ...sample, company: "First" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await repo.create("ws1", { ...sample, company: "Second" });

    expect((await repo.list("ws1")).map((x) => x.company)).toEqual(["Second", "First"]);

    const updated = await repo.update("ws1", a.id, { status: "Interview" });
    expect(updated?.status).toBe("Interview");
    expect(updated?.company).toBe("First");
    expect(updated!.updatedAt >= a.updatedAt).toBe(true);

    expect(await repo.remove("ws1", b.id)).toBe(true);
    expect(await repo.remove("ws1", b.id)).toBe(false);
    expect(await repo.list("ws1")).toHaveLength(1);
  });

  it("returns null when updating something that doesn't exist", async () => {
    expect(await repo.update("ws1", crypto.randomUUID(), { status: "Selected" })).toBeNull();
  });

  it("keeps workspaces isolated", async () => {
    const mine = await repo.create("ws1", sample);
    await repo.create("ws2", sample);
    expect(await repo.list("ws1")).toHaveLength(1);
    expect(await repo.remove("ws2", mine.id)).toBe(false);
    expect(await repo.update("ws2", mine.id, { status: "Rejected" })).toBeNull();
  });

  it("doesn't lose writes when many requests arrive at once", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.create("ws1", { ...sample, company: `Co ${i}` })));
    expect(await repo.list("ws1")).toHaveLength(25);
    const onDisk = JSON.parse(await readFile(file, "utf8"));
    expect(onDisk.ws1).toHaveLength(25);
  });

  it("surfaces a StorageError for a corrupted file instead of wiping it", async () => {
    await repo.create("ws1", sample);
    await writeFile(file, "{ not json", "utf8");
    await expect(repo.list("ws1")).rejects.toBeInstanceOf(StorageError);
    expect(await readFile(file, "utf8")).toBe("{ not json");
  });

  it("recovers after a failed operation (queue isn't poisoned)", async () => {
    await repo.create("ws1", sample);
    await writeFile(file, "{ not json", "utf8");
    await expect(repo.list("ws1")).rejects.toBeInstanceOf(StorageError);
    await writeFile(file, "{}", "utf8");
    expect(await repo.list("ws1")).toEqual([]);
  });
});
