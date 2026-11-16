"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { buttonClass, Card, inputClass, labelClass, Notice, SectionTitle } from "@/components/ui";
import type { Language } from "@/lib/dates";
import { createYear } from "./actions";

export function YearPlanner({ defaultYear, defaultLanguage }: { defaultYear: number; defaultLanguage: Language }) {
  const [state, action] = useActionState(createYear, undefined);
  return (
    <Card className="mb-6">
      <SectionTitle>Plan a full year</SectionTitle>
      <p className="mb-5 text-[14px] leading-relaxed text-muted">
        Create all 12 months and their Sunday drafts. Existing songs, people, and plans stay as they are.
        Add the team and songs when you&apos;re ready.
      </p>
      <form action={action} className="space-y-4">
        <div className="year-planner-fields">
          <div>
            <label htmlFor="plan-year" className={labelClass}>Year</label>
            <input id="plan-year" name="year" type="number" min={2000} max={2100} step={1} defaultValue={defaultYear} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="year-language" className={labelClass}>First Sunday&apos;s language</label>
            <select id="year-language" name="firstLanguage" defaultValue={defaultLanguage} className={inputClass}>
              <option value="tl">Tagalog first</option>
              <option value="en">English first</option>
            </select>
          </div>
          <SubmitButton pendingLabel="Creating Sundays…">Create year&apos;s lineups</SubmitButton>
        </div>
        <p className="text-[12px] text-muted">Tagalog and English alternate across months. Existing Sunday languages are kept.</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-muted">
          <input type="checkbox" name="openAvailability" className="h-4 w-4" />
          Open availability for newly created months
        </label>
      </form>
      {state && (
        <div role="status" className="mt-4 space-y-3">
          <Notice tone={state.ok ? "ok" : "danger"}>{state.message}</Notice>
          {state.ok && state.year && (
            <Link href={`/lead?year=${state.year}`} className={buttonClass("soft")}>
              View {state.year} lineups
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
