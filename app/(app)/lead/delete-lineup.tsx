"use client";

import { useActionState, useId, useRef, useState } from "react";
import { SubmitButton } from "@/components/client";
import { buttonClass, Notice } from "@/components/ui";
import { deleteLineups } from "./delete-actions";

type DeleteTarget = { label: string } & (
  { scope: "sunday"; target: string; serviceId: number } |
  { scope: "month"; target: string; serviceIds: number[] }
);

export function DeleteLineup(props: DeleteTarget) {
  // Keep the reviewed dates frozen if another leader changes the live page.
  const [reviewed, setReviewed] = useState<DeleteTarget | null>(null);
  const open = reviewed !== null;
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  return <div className="mt-5 border-t border-line pt-4">
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId}
      className={buttonClass("danger")} onClick={() => setReviewed(open ? null : props)}>
      {props.scope === "sunday" ? "Delete lineup" : "Delete this month"}
    </button>
    {reviewed && <div id={panelId} className="mt-4">
      <DeleteConfirmation {...reviewed} onCancel={() => { setReviewed(null); trigger.current?.focus(); }} />
    </div>}
  </div>;
}

function DeleteConfirmation(props: DeleteTarget & { onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteLineups, undefined);
  const [confirmed, setConfirmed] = useState(false);
  const count = props.scope === "month" ? props.serviceIds.length : 1;
  return <form action={action} data-no-draft aria-label={`Delete ${props.label}`} className="space-y-4 rounded-2xl border border-danger/20 bg-danger-soft/40 p-4">
    <input type="hidden" name="scope" value={props.scope} />
    <input type="hidden" name="target" value={props.target} />
    {props.scope === "sunday"
      ? <input type="hidden" name="serviceId" value={props.serviceId} />
      : <input type="hidden" name="serviceIds" value={JSON.stringify(props.serviceIds)} />}
    <div>
      <p className="font-bold text-danger">Delete {props.label}?</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        {props.scope === "month" ? `Removes this month and all ${count} Sunday lineup${count === 1 ? "" : "s"}, including its theme and availability notes.` : "Removes this Sunday's lineup."}
        {" "}Songs, assigned roles, availability answers, and queued reminders for the removed lineups will also be deleted. This cannot be undone.
      </p>
    </div>
    <fieldset disabled={pending} className="space-y-4">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-relaxed">
        <input type="checkbox" name="confirmed" value={props.target} required checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-danger" />
        <span>I understand that {props.label} will be permanently deleted.</span>
      </label>
      {state?.error && <div role="alert"><Notice tone="danger">{state.error}</Notice></div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass("secondary")} onClick={props.onCancel}>Cancel</button>
        <SubmitButton variant="danger" disabled={!confirmed} pendingLabel="Deleting…">
          {props.scope === "sunday" ? "Permanently delete lineup" : "Permanently delete month"}
        </SubmitButton>
      </div>
    </fieldset>
  </form>;
}
