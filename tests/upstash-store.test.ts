import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "@/server/repository/types";
import { UpstashApplicationRepository } from "@/server/repository/upstash-store";

/**
 * A tiny in-memory fake of Upstash's REST /pipeline endpoint (hash commands only),
 * so we can verify the driver sends the right commands and parses replies correctly.
 */
function installFakeUpstash() {
  const hashes = new Map<string, Map<string, string>>();
  const commandsSeen: Array<Array<string | number>> = [];

  const run = (cmd: Array<string | number>): unknown => {
    commandsSeen.push(cmd);
    const [name, key, ...rest] = cmd as [string, string, ...string[]];
    const hash = hashes.get(key) ?? new Map<string, string>();
    switch (name) {
      case "HSET":
        hash.set(rest[0]!, rest[1]!);
        hashes.set(key, hash);
        return 1;
      case "HGET":
        return hash.get(rest[0]!) ?? null;
      case "HDEL":
        return hash.delete(rest[0]!) ? 1 : 0;
      case "HGETALL":
        return [...hash.entries()].flat();
      case "EXPIRE":
        return 1;
      default:
        throw new Error(`unsupported ${name}`);
    }
  };

  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe("https://fake.upstash.io/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    const commands = JSON.parse(init.body as string) as Array<Array<string | number>>;
    return new Response(JSON.stringify(commands.map((c) => ({ result: run(c) }))), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, commandsSeen };
}

const sample = { company: "Acme", role: "Engineer", status: "Applied" as const, followUpDate: null };

describe("UpstashApplicationRepository", () => {
  let repo: UpstashApplicationRepository;
  let fake: ReturnType<typeof installFakeUpstash>;

  beforeEach(() => {
    fake = installFakeUpstash();
    repo = new UpstashApplicationRepository("https://fake.upstash.io", "secret");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("supports the full create / list / update / remove cycle", async () => {
    const a = await repo.create("ws1", { ...sample, company: "First" });
    await new Promise((r) => setTimeout(r, 5));
    await repo.create("ws1", { ...sample, company: "Second" });

    expect((await repo.list("ws1")).map((x) => x.company)).toEqual(["Second", "First"]);
    expect((await repo.update("ws1", a.id, { status: "Interview" }))?.status).toBe("Interview");
    expect(await repo.remove("ws1", a.id)).toBe(true);
    expect(await repo.remove("ws1", a.id)).toBe(false);
    expect(await repo.update("ws1", a.id, { status: "Selected" })).toBeNull();
    expect(await repo.list("ws1")).toHaveLength(1);
  });

  it("scopes keys by workspace and sets an expiry on writes", async () => {
    await repo.create("ws1", sample);
    expect(fake.commandsSeen[0]?.[1]).toBe("jobline:apps:ws1");
    expect(fake.commandsSeen.some((c) => c[0] === "EXPIRE")).toBe(true);
    expect(await repo.list("ws2")).toEqual([]);
  });

  it("raises StorageError when the database is unreachable or rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(repo.list("ws1")).rejects.toBeInstanceOf(StorageError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    await expect(repo.list("ws1")).rejects.toBeInstanceOf(StorageError);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([{ error: "ERR bad" }]), { status: 200 })),
    );
    await expect(repo.list("ws1")).rejects.toBeInstanceOf(StorageError);
  });
});
