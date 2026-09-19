import { idSchema, updateApplicationSchema } from "@/lib/validation";
import { HttpError, ok, readJson, route, validationError } from "@/server/http";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

type Params = { id: string };

function parseId(raw: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_ID", "That application id isn't valid");
  return parsed.data;
}

const notFound = () => new HttpError(404, "NOT_FOUND", "That application no longer exists");

/** PATCH /api/applications/:id - change any of company, role, status, followUpDate. */
export const PATCH = route<Params>(async ({ request, workspaceId, params }) => {
  const id = parseId(params.id);
  const parsed = updateApplicationSchema.safeParse(await readJson(request));
  if (!parsed.success) throw validationError(parsed.error);

  const updated = await getRepository().update(workspaceId, id, parsed.data);
  if (!updated) throw notFound();
  return ok(updated);
});

/** DELETE /api/applications/:id */
export const DELETE = route<Params>(async ({ workspaceId, params }) => {
  const id = parseId(params.id);
  const deleted = await getRepository().remove(workspaceId, id);
  if (!deleted) throw notFound();
  return ok({ id });
});
