"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/client";
import { Card, Chip, cx, inputClass, Notice } from "@/components/ui";
import { LANGUAGE_LABELS, longDate, type Language } from "@/lib/dates";
import { ANSWER_LABELS, type Answer } from "@/lib/lineup";
import { saveAvailability } from "./actions";
import { OPEN_TO_OPTIONS } from "./options";

type FormSunday = {
  id: number;
  date: string;
  language: Language;
  occasion: string | null;
  myRoles: string[];
};

const answerStyles: Record<Answer, string> = {
  yes: "border-ok bg-ok-soft text-ok",
  maybe: "border-warn bg-warn-soft text-warn",
  no: "border-danger bg-danger-soft text-danger",
};

export function AvailabilityForm({
  monthId,
  sundays,
  initial,
}: {
  monthId: string;
  sundays: FormSunday[];
  initial: {
    answers: Record<number, Answer>;
    openTo: string[];
    tryLead: boolean;
    songIdea: string;
  };
}) {
  const [state, action] = useActionState(saveAvailability, undefined);
  const [answers, setAnswers] = useState(initial.answers);
  const [openTo, setOpenTo] = useState(initial.openTo);
  const [tryLead, setTryLead] = useState(initial.tryLead);
  const [songIdea, setSongIdea] = useState(initial.songIdea);

  return (
    <form action={action} className="availability-layout">
      <input type="hidden" name="monthId" value={monthId} />

      <div className="availability-summary">
        <p><strong>{sundays.filter((s) => answers[s.id]).length} of {sundays.length}</strong> Sundays answered</p>
        <progress className="home-progress" value={sundays.filter((s) => answers[s.id]).length} max={sundays.length} aria-label="Sundays answered" />
      </div>
      <ul className="availability-days">
        {sundays.map((s) => (
          <li key={s.id}>
            <fieldset className="availability-day rounded-3xl border border-line bg-card p-4">
              <legend className="sr-only">{longDate(s.date)}</legend>
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1" aria-hidden="true">
                <span className="font-display text-[18px] font-bold">{longDate(s.date)}</span>
                <span className="text-[14px] text-muted">{LANGUAGE_LABELS[s.language]}</span>
                {s.occasion && <Chip tone="primary">{s.occasion}</Chip>}
              </div>
              {s.myRoles.length > 0 && (
                <p className="mb-3 text-[14px] text-muted">
                  You&apos;re already on the draft as {s.myRoles.join(", ").toLowerCase()}.
                </p>
              )}
              <div className="availability-options">
                {(["yes", "maybe", "no"] as const).map((answer) => (
                  <label
                    key={answer}
                    className={cx(
                      "availability-option flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 px-2 text-center text-[15px] font-bold has-focus-visible:outline-3 has-focus-visible:outline-primary",
                      answers[s.id] === answer ? answerStyles[answer] : "border-line bg-card text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name={`answer-${s.id}`}
                      value={answer}
                      checked={answers[s.id] === answer}
                      onChange={() => setAnswers({ ...answers, [s.id]: answer })}
                      className="sr-only"
                    />
                    {ANSWER_LABELS[answer]}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      <Card>
        <fieldset>
          <legend className="font-display text-[18px] font-bold">I&apos;m open to</legend>
          <p className="mb-3 text-[14px] text-muted">Leaders use this when they fill the lineup.</p>
          <div className="flex flex-wrap gap-2">
            {OPEN_TO_OPTIONS.map((option) => {
              const on = openTo.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cx(
                    "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-[15px] font-bold has-focus-visible:outline-3 has-focus-visible:outline-primary",
                    on ? "border-primary bg-primary-soft text-primary" : "border-line bg-card text-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    name="openTo"
                    value={option.value}
                    checked={on}
                    onChange={() =>
                      setOpenTo(on ? openTo.filter((v) => v !== option.value) : [...openTo, option.value])
                    }
                    className="sr-only"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="mt-5 flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-[16px] font-bold">I&apos;d like to try leading</span>
            <span className="block text-[14px] text-muted">A leader can pair you with someone.</span>
          </span>
          <input
            type="checkbox"
            name="tryLead"
            checked={tryLead}
            onChange={(e) => setTryLead(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={cx(
              "relative h-8 w-14 flex-none rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-primary",
              tryLead ? "bg-primary" : "bg-line",
            )}
          >
            <span
              className={cx(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                tryLead ? "translate-x-7" : "translate-x-1",
              )}
            />
          </span>
        </label>

        <div className="mt-5">
          <label htmlFor="songIdea" className="mb-1.5 block text-[16px] font-bold">
            A song you&apos;d like us to sing <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="songIdea"
            name="songIdea"
            value={songIdea}
            onChange={(e) => setSongIdea(e.target.value)}
            maxLength={200}
            placeholder="Title and artist"
            className={inputClass}
          />
        </div>
      </Card>

      <div className="availability-actions">
        {state && (
          <div role="status">
            <Notice tone={state.ok ? "ok" : "danger"}>{state.message}</Notice>
          </div>
        )}

        <SubmitButton className="w-full" pendingLabel="Sending…">
          Send my availability
        </SubmitButton>
      </div>
    </form>
  );
}
