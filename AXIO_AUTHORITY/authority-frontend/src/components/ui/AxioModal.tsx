"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AxioButton } from "./AxioButton";

/**
 * AxioModal — accessible dialog.
 * - role="dialog" aria-modal, labelled by title
 * - Escape closes, focus moves into the dialog and is restored on close
 * - Overlay click closes only when dismissible
 */
export function AxioModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  dismissible = true,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-authority-950/45 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={[
          "relative flex max-h-[90vh] w-full flex-col rounded-lg bg-white shadow-axio-md",
          "focus:outline-none",
          wide ? "max-w-3xl" : "max-w-lg",
        ].join(" ")}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            {footer}
          </div>
        )}
        {dismissible && !footer && (
          <div className="absolute right-4 top-4">
            <AxioButton variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
              ✕
            </AxioButton>
          </div>
        )}
      </div>
    </div>
  );
}
