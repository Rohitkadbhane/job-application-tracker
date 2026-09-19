"use client";

import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { STATUS_META } from "@/lib/constants";
import { addDaysISO } from "@/lib/followUp";
import { STATUSES, type ApplicationStatus, type JobApplication, type NewApplication } from "@/lib/types";
import { createApplicationSchema, toFieldErrors } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ApplicationFormModalProps {
  /** null = create a new application; otherwise edit this one. */
  application: JobApplication | null;
  /** Should throw (ApiError) when saving fails; the modal stays open and shows why. */
  onSubmit: (values: NewApplication) => Promise<void>;
  onClose: () => void;
}

type FieldErrors = Partial<Record<"company" | "role" | "status" | "followUpDate" | "_form", string>>;

const QUICK_FOLLOW_UPS = [
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export function ApplicationFormModal({ application, onSubmit, onClose }: ApplicationFormModalProps) {
  const isEditing = application !== null;
  const [company, setCompany] = useState(application?.company ?? "");
  const [role, setRole] = useState(application?.role ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? "Applied");
  const [followUpDate, setFollowUpDate] = useState(application?.followUpDate ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focusFirstInvalid(found: FieldErrors) {
    const order = ["company", "role", "followUpDate"] as const;
    const first = order.find((name) => found[name]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createApplicationSchema.safeParse({
      company,
      role,
      status,
      followUpDate: followUpDate || null,
    });
    if (!parsed.success) {
      const found = toFieldErrors(parsed.error);
      setErrors(found);
      focusFirstInvalid(found);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
      // On success the parent unmounts this modal.
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setErrors(error.fieldErrors);
        focusFirstInvalid(error.fieldErrors);
      } else {
        setErrors({ _form: error instanceof Error ? error.message : "Could not save. Please try again." });
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEditing ? "Edit application" : "Add application"}
      description={isEditing ? undefined : "Track a role you've applied for."}
      onClose={onClose}
      busy={submitting}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors._form ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {errors._form}
          </p>
        ) : null}

        <Field label="Company name" htmlFor="company" error={errors.company}>
          <input
            id="company"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            data-autofocus
            autoComplete="organization"
            placeholder="e.g. Northwind Traders"
            maxLength={120}
            aria-invalid={errors.company ? true : undefined}
            aria-describedby={errors.company ? "company-error" : undefined}
            className={inputClass(!!errors.company)}
          />
        </Field>

        <Field label="Job role" htmlFor="role" error={errors.role}>
          <input
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            autoComplete="organization-title"
            placeholder="e.g. Frontend Engineer"
            maxLength={120}
            aria-invalid={errors.role ? true : undefined}
            aria-describedby={errors.role ? "role-error" : undefined}
            className={inputClass(!!errors.role)}
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Status</legend>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((option) => {
              const meta = STATUS_META[option];
              const selected = status === option;
              return (
                <label key={option} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={option}
                    checked={selected}
                    onChange={() => setStatus(option)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                      selected
                        ? cn(meta.soft, meta.text, "border-current")
                        : "border-line-strong bg-surface text-muted hover:text-ink",
                    )}
                  >
                    <span aria-hidden="true" className={cn("size-2 rounded-full", meta.dot)} />
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field
          label="Follow-up date (optional)"
          htmlFor="followUpDate"
          error={errors.followUpDate}
          hint="We'll flag this application when it's time to check in. Reminders show for Applied and Interview."
        >
          <input
            id="followUpDate"
            name="followUpDate"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            aria-invalid={errors.followUpDate ? true : undefined}
            aria-describedby={errors.followUpDate ? "followUpDate-error" : "followUpDate-hint"}
            className={inputClass(!!errors.followUpDate)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_FOLLOW_UPS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFollowUpDate(addDaysISO(days))}
                className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-ink hover:text-ink"
              >
                {label}
              </button>
            ))}
            {followUpDate ? (
              <button
                type="button"
                onClick={() => setFollowUpDate("")}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-muted underline underline-offset-2 hover:text-ink"
              >
                Clear date
              </button>
            ) : null}
          </div>
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => formRef.current?.closest("dialog")?.close()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {submitting ? "Saving..." : isEditing ? "Save changes" : "Add application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const inputClass = (invalid: boolean) =>
  cn(
    "h-10 w-full rounded-lg border bg-white px-3 text-base text-ink placeholder:text-[#6b7671] sm:text-sm",
    invalid ? "border-danger" : "border-line-strong",
  );

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
