"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { inputClass, labelClass, Notice } from "@/components/ui";
import { unlockLeaderTools } from "./actions";

export function LeaderForm() {
  const [state, action] = useActionState(unlockLeaderTools, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="leader-code" className={labelClass}>
          Leader code
        </label>
        <input
          id="leader-code"
          name="code"
          type="password"
          required
          autoComplete="off"
          className={inputClass}
        />
      </div>
      {state?.error && (
        <div role="alert">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      )}
      <SubmitButton variant="soft" className="w-full" pendingLabel="Checking…">
        Unlock leader tools
      </SubmitButton>
    </form>
  );
}
