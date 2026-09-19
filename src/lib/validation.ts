import { z } from "zod";
import { MAX_TEXT_LENGTH } from "./constants";
import { STATUSES } from "./types";

/**
 * Single source of truth for input rules. The same schemas run in the browser
 * (instant feedback) and in the route handlers (the only place that can be trusted).
 */

const isRealCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Rejects things like 2026-02-31, which Date silently rolls over into March.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const text = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(MAX_TEXT_LENGTH, `${label} must be ${MAX_TEXT_LENGTH} characters or fewer`);

const status = z.enum(STATUSES, { error: "Choose a valid status" });

const followUpDate = z
  .string()
  .refine(isRealCalendarDate, "Enter a valid date")
  .nullable();

export const createApplicationSchema = z.object({
  company: text("Company name"),
  role: text("Job role"),
  status: status.default("Applied"),
  followUpDate: followUpDate.default(null),
});

export const updateApplicationSchema = z
  .object({
    company: text("Company name").optional(),
    role: text("Job role").optional(),
    status: status.optional(),
    followUpDate: followUpDate.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, "Provide at least one field to update");

export const idSchema = z.uuid({ error: "Invalid application id" });

/** Flatten zod issues into { fieldName: firstMessage } for forms and API responses. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
