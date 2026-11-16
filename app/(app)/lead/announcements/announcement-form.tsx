"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/client";
import { Card, inputClass, labelClass, Notice, SectionTitle } from "@/components/ui";
import { publishTeamAnnouncement } from "./actions";

export function AnnouncementForm({ id, titleLimit, bodyLimit }: { id: string; titleLimit: number; bodyLimit: number }) {
  const [state, action] = useActionState(publishTeamAnnouncement, undefined);
  const [title, setTitle] = useState(state?.title ?? "");
  const [body, setBody] = useState(state?.body ?? "");
  return <Card className="mb-7">
    <SectionTitle>Write to the team</SectionTitle>
    <p className="mb-5 text-[14px] leading-relaxed text-muted">Publish a message for everyone. It appears on Home and in Updates, with a phone alert for members who have enabled notifications.</p>
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="announcement-title" className={labelClass}>Title</label>
        <input id="announcement-title" name="title" required maxLength={titleLimit} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Saturday rehearsal at 4 PM" className={inputClass} />
      </div>
      <div>
        <label htmlFor="announcement-body" className={labelClass}>Message for everyone</label>
        <textarea id="announcement-body" name="body" required maxLength={bodyLimit} rows={7} value={body} onChange={e => setBody(e.target.value)}
          placeholder="Share the details, where to meet, and anything the team needs to prepare." className={`${inputClass} py-3`} />
        <p className="mt-1 text-right text-[12px] text-muted">{body.length.toLocaleString()} / {bodyLimit.toLocaleString()}</p>
      </div>
      {state?.error && <div role="alert"><Notice tone="danger">{state.error}</Notice></div>}
      <SubmitButton pendingLabel="Publishing…" className="w-full sm:w-auto">Publish announcement</SubmitButton>
      <p className="text-[12px] text-muted">Check your message before publishing. You can archive it later; alerts already delivered to phones cannot be recalled.</p>
    </form>
  </Card>;
}
