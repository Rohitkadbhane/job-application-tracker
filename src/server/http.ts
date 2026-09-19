import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { toFieldErrors } from "@/lib/validation";
import { StorageError } from "./repository";

/**
 * Small toolkit shared by all route handlers:
 *  - one success/failure response shape
 *  - one place that turns exceptions into safe HTTP responses
 *  - anonymous per-browser workspaces (a cookie), so visitors don't see each other's data
 */

const WORKSPACE_COOKIE = "jobline_workspace";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NO_STORE = { "Cache-Control": "no-store" };

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const validationError = (error: ZodError) =>
  new HttpError(422, "VALIDATION_ERROR", "Some fields need attention", toFieldErrors(error));

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: NO_STORE });
}

function fail(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status, headers: NO_STORE },
  );
}

/** Parse a JSON body, turning malformed input into a clean 400 instead of a crash. */
export async function readJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as application/json");
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "The request body is not valid JSON");
  }
}

interface HandlerContext<P> {
  request: NextRequest;
  workspaceId: string;
  params: P;
}

/**
 * Wraps a route handler with workspace resolution and error translation.
 * Handlers just return `ok(...)` or throw `HttpError`; everything else becomes a safe 500.
 */
export function route<P = Record<string, never>>(
  handler: (context: HandlerContext<P>) => Promise<NextResponse>,
) {
  return async (request: NextRequest, segment: { params: Promise<P> }): Promise<NextResponse> => {
    const existing = request.cookies.get(WORKSPACE_COOKIE)?.value;
    const isValid = existing !== undefined && UUID_PATTERN.test(existing);
    const workspaceId = isValid ? existing : randomUUID();

    let response: NextResponse;
    try {
      response = await handler({ request, workspaceId, params: await segment.params });
    } catch (error) {
      response = toErrorResponse(error);
    }

    if (!isValid) {
      response.cookies.set(WORKSPACE_COOKIE, workspaceId, {
        httpOnly: true,
        sameSite: "lax",
        // Only mark it Secure over HTTPS, otherwise browsers (Safari) drop it on http://localhost.
        secure: isHttps(request),
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  };
}

function isHttps(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return fail(error.status, error.code, error.message, error.fieldErrors);
  }
  if (error instanceof StorageError) {
    console.error("[storage]", error.message, error.cause);
    return fail(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable. Please try again.");
  }
  console.error("[unhandled]", error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
}
