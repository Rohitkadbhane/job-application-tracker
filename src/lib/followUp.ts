import { FOLLOW_UP_SOON_DAYS } from "./constants";
import type { JobApplication } from "./types";

/**
 * Follow-up reminders.
 *
 * Dates are handled as plain "YYYY-MM-DD" strings and compared as whole
 * calendar days. Going through timestamps would make "today" flip depending on
 * the viewer's timezone and daylight saving.
 */

export type FollowUpKind = "overdue" | "today" | "soon" | "upcoming";

export interface FollowUpState {
  kind: FollowUpKind;
  /** Whole days from today. Negative when overdue. */
  days: number;
}

const MS_PER_DAY = 86_400_000;

function toDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / MS_PER_DAY);
}

/** Today's date in the viewer's local timezone as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(days: number, from: string = todayISO()): string {
  const next = new Date((toDayNumber(from) + days) * MS_PER_DAY);
  return next.toISOString().slice(0, 10);
}

/** Reminders only make sense while an application is still in play. */
export function isActive(app: Pick<JobApplication, "status">): boolean {
  return app.status === "Applied" || app.status === "Interview";
}

export function getFollowUpState(
  app: Pick<JobApplication, "status" | "followUpDate">,
  today: string = todayISO(),
): FollowUpState | null {
  if (!app.followUpDate || !isActive(app)) return null;
  const days = toDayNumber(app.followUpDate) - toDayNumber(today);
  if (days < 0) return { kind: "overdue", days };
  if (days === 0) return { kind: "today", days };
  if (days <= FOLLOW_UP_SOON_DAYS) return { kind: "soon", days };
  return { kind: "upcoming", days };
}

/** True when the reminder needs action now (overdue or due today). */
export function isFollowUpDue(
  app: Pick<JobApplication, "status" | "followUpDate">,
  today?: string,
): boolean {
  const state = getFollowUpState(app, today);
  return state?.kind === "overdue" || state?.kind === "today";
}

const pluralDays = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

export function describeFollowUp(state: FollowUpState, isoDate: string): string {
  switch (state.kind) {
    case "overdue":
      return `Follow-up overdue by ${pluralDays(Math.abs(state.days))}`;
    case "today":
      return "Follow up today";
    case "soon":
      return state.days === 1 ? "Follow up tomorrow" : `Follow up in ${pluralDays(state.days)}`;
    case "upcoming":
      return `Follow up on ${formatShortDate(isoDate)}`;
  }
}

/** "24 Oct" (adds the year when it isn't the current one). */
export function formatShortDate(value: string): string {
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const sameYear = y === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
