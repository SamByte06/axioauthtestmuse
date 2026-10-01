"use client";

import { useId, useState } from "react";
import { z } from "zod";
import { destructiveActionSchema } from "@axio-authority/validation";
import { AxioModal } from "./AxioModal";
import { AxioButton } from "./AxioButton";
import { AxioInput } from "./AxioInput";

/**
 * AxioConfirmDialog — the destructive-action gate.
 *
 * Requires:
 *  - explicit confirmation (re-type the resource identifier),
 *  - a reason (≥10 chars) written to the audit log,
 *  - a clear statement of consequence.
 */
export function AxioConfirmDialog({
  open,
  title,
  resourceName,
  resourceId,
  consequence,
  confirmLabel,
  requireReason = true,
  onCancel,
  onConfirm,
  confirming = false,
  error,
}: {
  open: boolean;
  title: string;
  resourceName: string;
  resourceId: string;
  consequence: string;
  confirmLabel: string;
  requireReason?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  confirming?: boolean;
  error?: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const reasonId = useId();

  const canSubmit =
    confirmation.trim() === resourceId.trim() &&
    (!requireReason || reason.trim().length >= 10) &&
    !confirming;

  function handleConfirm() {
    const parsed = destructiveActionSchema.safeParse({ reason, confirmation });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the confirmation fields.");
      return;
    }
    if (parsed.data.confirmation.trim() !== resourceId.trim()) {
      setFormError(`Type "${resourceId}" exactly to confirm.`);
      return;
    }
    setFormError(undefined);
    void onConfirm(parsed.data.reason);
  }

  return (
    <AxioModal
      open={open}
      title={title}
      onClose={onCancel}
      dismissible={!confirming}
      description={`You are about to affect ${resourceName}:`}
      footer={
        <>
          <AxioButton variant="secondary" onClick={onCancel} disabled={confirming}>
            Cancel
          </AxioButton>
          <AxioButton variant="danger" onClick={handleConfirm} loading={confirming} disabled={!canSubmit}>
            {confirmLabel}
          </AxioButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-mono text-sm font-semibold text-red-900">{resourceId}</p>
          <p className="mt-1 text-sm text-red-800">{resourceName}</p>
        </div>
        <p className="text-sm text-slate-700">{consequence}</p>
        <AxioInput
          label={`Type "${resourceId}" to confirm`}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          mono
          autoComplete="off"
        />
        {requireReason && (
          <div>
            <label htmlFor={reasonId} className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Reason <span className="text-slate-500">(written to the audit log)</span>
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
            />
          </div>
        )}
        {(formError || error) && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {formError ?? error}
          </p>
        )}
      </div>
    </AxioModal>
  );
}
