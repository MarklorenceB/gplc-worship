"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { ChevronRightIcon } from "@/components/icons";
import { enterTeamCode } from "./actions";


export function TeamCodeForm() {
  const [state, action] = useActionState(enterTeamCode, undefined);
  return (
    <form action={action} className="login-form">
      <div>
        <label htmlFor="code" className="login-label">Team code</label>
        <div className="login-inputWrap">
          <svg className="login-keyIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="9" r="4" /><path d="m11 12 9 9m-4-4 3-3m-6 3 3-3" />
          </svg>
          <input
            id="code"
            name="code"
            required
            placeholder="Enter your team code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="login-input"
            aria-invalid={!!state?.error}
            aria-describedby={state?.error ? "code-hint code-error" : "code-hint"}
          />
        </div>
        <p id="code-hint" className="login-hint">You&apos;ll find it pinned in the team group chat.</p>
      </div>
      {state?.error && <p id="code-error" role="alert" className="login-error">{state.error}</p>}
      <SubmitButton className="login-submit" pendingLabel="Checking your code…">
        Continue <ChevronRightIcon size={18} />
      </SubmitButton>
      <p className="login-formNote">Next, you&apos;ll choose your name. No password needed.</p>
    </form>
  );
}
