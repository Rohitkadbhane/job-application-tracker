"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./Icons";
import { IconButton } from "./Button";

interface ModalProps {
  title: string;
  description?: string;
  /** Called after the dialog has closed (Escape, backdrop click, close button). */
  onClose: () => void;
  /** While true the dialog can't be dismissed, e.g. during a save. */
  busy?: boolean;
  children: ReactNode;
}

/**
 * Built on the native <dialog> element, which gives us for free:
 * a focus trap, Escape to close, an inert page behind it, and correct screen-reader semantics.
 * Mount it to open it, unmount it to close it: form state resets automatically.
 */
export function Modal({ title, description, onClose, busy = false, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before the dialog is open, so pick the initial focus ourselves:
      // the first element marked data-autofocus, otherwise the browser default.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }

    // A modal dialog doesn't stop the page behind it from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClick={(event) => {
        // The dialog element has no padding, so a click on itself is a click on the backdrop.
        if (event.target === event.currentTarget && !busy) event.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-1.5rem)] max-w-md animate-pop rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-semibold leading-tight">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            label="Close"
            disabled={busy}
            onClick={() => ref.current?.close()}
            className="-mr-2 -mt-1 shrink-0"
          >
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
