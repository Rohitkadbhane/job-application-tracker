import { getFollowUpState, formatShortDate } from "@/lib/followUp";
import type { ApplicationStatus, JobApplication } from "@/lib/types";
import { IconButton } from "@/components/ui/Button";
import { PencilIcon, TrashIcon } from "@/components/ui/Icons";
import { FollowUpBadge } from "./FollowUpBadge";
import { StageTrack } from "./StageTrack";
import { StatusSelect } from "./StatusSelect";

interface ApplicationRowProps {
  application: JobApplication;
  index: number;
  today: string;
  pending: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

export function ApplicationRow({
  application,
  index,
  today,
  pending,
  onStatusChange,
  onEdit,
  onDelete,
}: ApplicationRowProps) {
  const { company, role, status, followUpDate, createdAt } = application;
  const followUp = getFollowUpState(application, today);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:gap-x-6">
      <div className="col-start-1 row-start-1 min-w-0">
        <p className="truncate font-display text-lg font-semibold leading-snug" title={company}>
          {company}
        </p>
        <p className="truncate text-sm text-muted" title={role}>
          {role}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-muted">Added {formatShortDate(createdAt)}</span>
          {followUp && followUpDate ? <FollowUpBadge state={followUp} date={followUpDate} /> : null}
        </div>
      </div>

      <div className="col-start-1 row-start-2 md:col-start-2 md:row-start-1">
        <StageTrack status={status} index={index} />
      </div>

      <div className="col-start-2 row-start-2 justify-self-end md:col-start-3 md:row-start-1">
        <StatusSelect
          value={status}
          label={`Status for ${company}, ${role}`}
          disabled={pending}
          onChange={(next) => onStatusChange(application.id, next)}
        />
      </div>

      <div className="col-start-2 row-start-1 flex justify-self-end md:col-start-4">
        <IconButton label={`Edit ${company}`} onClick={() => onEdit(application)}>
          <PencilIcon className="size-[18px]" />
        </IconButton>
        <IconButton
          label={`Delete ${company}`}
          onClick={() => onDelete(application)}
          className="hover:bg-danger/10 hover:text-danger"
        >
          <TrashIcon className="size-[18px]" />
        </IconButton>
      </div>
    </li>
  );
}
