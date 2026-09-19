import type { ApiFailure, ApiSuccess, ApplicationPatch, JobApplication, NewApplication } from "./types";

const BASE = "/api/applications";

/** Error thrown for every failed API call, with enough detail for the UI to react. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    // fetch only rejects on network-level failures (offline, DNS, CORS...).
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, "NETWORK");
  }

  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    // Non-JSON response (e.g. a platform error page). Handled below.
  }

  if (!response.ok || !body || "error" in body) {
    const failure = body && "error" in body ? body.error : null;
    throw new ApiError(
      failure?.message ?? "Something went wrong on our side. Please try again.",
      response.status,
      failure?.code ?? "UNKNOWN",
      failure?.fieldErrors,
    );
  }
  return body.data;
}

export const applicationsApi = {
  list: () => request<JobApplication[]>(BASE),
  create: (input: NewApplication) =>
    request<JobApplication>(BASE, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, patch: ApplicationPatch) =>
    request<JobApplication>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => request<{ id: string }>(`${BASE}/${id}`, { method: "DELETE" }),
};
