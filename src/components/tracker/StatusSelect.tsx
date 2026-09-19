import { useId } from "react";
import { STATUS_META } from "@/lib/constants";
import { STATUSES, type ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@/components/ui/Icons";

interface StatusSelectProps {
  value: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
  /** Accessible name, e.g. "Status for Acme Corp". */
  label: string;
  disabled?: boolean;
}

/** A native <select> dressed as a pill: fully keyboard and screen-reader accessible, great on mobile. */
export function StatusSelect({ value, onChange, label, disabled }: StatusSelectProps) {
  const id = useId();
  const meta = STATUS_META[value];

  return (
    <div className={cn("relative inline-flex items-center rounded-full", meta.soft, meta.text)}>
      <span aria-hidden="true" className={cn("pointer-events-none absolute left-3 size-2 rounded-full", meta.dot)} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ApplicationStatus)}
        className="h-8 min-w-32 cursor-pointer appearance-none rounded-full bg-transparent pl-7 pr-8 text-sm font-semibold disabled:cursor-progress disabled:opacity-70"
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 size-4" />
    </div>
  );
}
