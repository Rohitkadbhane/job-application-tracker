import type { ApplicationStatus } from "./types";

export const MAX_TEXT_LENGTH = 100;
/** Safety cap so a single anonymous workspace can't grow without bound. */
export const MAX_APPLICATIONS = 500;

/**
 * Stages along the "line". Rejected is deliberately not a stage:
 * it is an exit from the line, which the UI draws differently.
 */
export const PIPELINE_STAGES = ["Applied", "Interview", "Selected"] as const;

export interface StatusMeta {
  label: ApplicationStatus;
  /** Tailwind classes; kept as full strings so Tailwind can detect them. */
  dot: string;
  text: string;
  soft: string;
  ring: string;
  /** Raw color for SVG/inline usage. */
  color: string;
  description: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  Applied: {
    label: "Applied",
    dot: "bg-applied",
    text: "text-applied-ink",
    soft: "bg-applied-soft",
    ring: "focus-visible:outline-applied",
    color: "var(--color-applied)",
    description: "Application sent, waiting to hear back",
  },
  Interview: {
    label: "Interview",
    dot: "bg-interview",
    text: "text-interview-ink",
    soft: "bg-interview-soft",
    ring: "focus-visible:outline-interview",
    color: "var(--color-interview)",
    description: "In conversation with the company",
  },
  Selected: {
    label: "Selected",
    dot: "bg-selected",
    text: "text-selected-ink",
    soft: "bg-selected-soft",
    ring: "focus-visible:outline-selected",
    color: "var(--color-selected)",
    description: "You got the job",
  },
  Rejected: {
    label: "Rejected",
    dot: "bg-rejected",
    text: "text-rejected-ink",
    soft: "bg-rejected-soft",
    ring: "focus-visible:outline-rejected",
    color: "var(--color-rejected)",
    description: "Not moving forward",
  },
};

/** Days ahead that count as "coming up soon" for a follow-up reminder. */
export const FOLLOW_UP_SOON_DAYS = 3;
