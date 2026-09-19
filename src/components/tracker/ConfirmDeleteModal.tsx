"use client";

import type { JobApplication } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDeleteModalProps {
  application: JobApplication;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({ application, onConfirm, onClose }: ConfirmDeleteModalProps) {
  return (
    <Modal
      title="Delete this application?"
      description={`${application.role} at ${application.company} will be removed. This can't be undone.`}
      onClose={onClose}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={(event) => event.currentTarget.closest("dialog")?.close()}
          data-autofocus
        >
          Keep it
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete application
        </Button>
      </div>
    </Modal>
  );
}
