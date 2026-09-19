import { MAX_APPLICATIONS } from "@/lib/constants";
import { createApplicationSchema } from "@/lib/validation";
import { HttpError, ok, readJson, route, validationError } from "@/server/http";
import { getRepository } from "@/server/repository";

// Responses depend on the visitor's cookie, so never prerender or cache.
export const dynamic = "force-dynamic";

/** GET /api/applications - every application in the caller's workspace, newest first. */
export const GET = route(async ({ workspaceId }) => {
  const applications = await getRepository().list(workspaceId);
  return ok(applications);
});

/** POST /api/applications - create an application. */
export const POST = route(async ({ request, workspaceId }) => {
  const parsed = createApplicationSchema.safeParse(await readJson(request));
  if (!parsed.success) throw validationError(parsed.error);

  const repository = getRepository();
  const existing = await repository.list(workspaceId);
  if (existing.length >= MAX_APPLICATIONS) {
    throw new HttpError(
      409,
      "LIMIT_REACHED",
      `You can track up to ${MAX_APPLICATIONS} applications. Delete some to add more.`,
    );
  }

  const created = await repository.create(workspaceId, parsed.data);
  return ok(created, 201);
});
