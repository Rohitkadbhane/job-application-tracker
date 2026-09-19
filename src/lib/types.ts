export const STATUSES = ["Applied", "Interview", "Rejected", "Selected"] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

/** A single tracked job application, exactly as it is stored and returned by the API. */
export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  /** Optional reminder date, calendar date only: "YYYY-MM-DD". */
  followUpDate: string | null;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** What the client sends when creating an application (after validation). */
export interface NewApplication {
  company: string;
  role: string;
  status: ApplicationStatus;
  followUpDate: string | null;
}

/** What the client may send when editing an application. */
export type ApplicationPatch = Partial<NewApplication>;

/** Envelope used by every API response so the client has one shape to parse. */
export type ApiSuccess<T> = { data: T };
export type ApiFailure = {
  error: {
    code: string;
    message: string;
    /** Field name -> message, present for validation errors. */
    fieldErrors?: Record<string, string>;
  };
};
