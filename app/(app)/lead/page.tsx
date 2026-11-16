import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoSubmitSelect, SubmitButton } from "@/components/client";
import { ChevronRightIcon } from "@/components/icons";
import { StatusChip } from "@/components/sunday";
import {
  buttonClass,
  Card,
  Chip,
  inputClass,
  labelClass,
  Notice,
  PageHeader,
  PageSkeleton,
  SectionTitle,
} from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { getAnswers, getSundaysInMonth, listMembers, listMonths } from "@/lib/data";
import {
  LANGUAGE_LABELS,
  monthLabel,
  monthName,
  monthOf,
  longDate,
  nextMonthId,
  shortDate,
} from "@/lib/dates";
import { getToday } from "@/lib/today";
import { lineupChecklist } from "@/lib/lineup";
import { YearPlanner } from "./year-planner";
import { createMonth, setAvailabilityOpen, updateMonth } from "./actions";
import { DeleteLineup } from "./delete-lineup";
import { validLineupDate, validLineupMonth } from "@/lib/db/delete-lineups";

export const metadata: Metadata = { title: "Lead" };

export default function LeadPage(props: PageProps<"/lead">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lead searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Lead({ searchParams }: { searchParams: PageProps<"/lead">["searchParams"] }) {
  await requireLeader();
  const today = await getToday();
  const all = await listMonths();
  const lastMonth = all.at(-1);
  const params = await searchParams;
  const deleted = typeof params.deleted === "string" ? params.deleted : "";
  const deletedLabel = validLineupDate(deleted) ? `${longDate(deleted)}, ${deleted.slice(0, 4)}`
    : validLineupMonth(deleted) ? monthLabel(deleted) : null;
  const currentYear = today.slice(0, 4);
  const years = [...new Set([currentYear, ...all.map((m) => m.id.slice(0, 4))])].sort();
  const requestedYear = typeof params.year === "string" ? params.year : undefined;
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : currentYear;
  const shown = all.filter((m) => m.id.startsWith(`${year}-`));
  const activeCount = (await listMembers()).filter((m) => m.active).length;

  const details = await Promise.all(
    shown.map(async (month) => {
      const sundays = await getSundaysInMonth(month.id);
      const answers = await getAnswers(sundays.map((s) => s.id));
      return { month, sundays, replied: new Set(answers.map((a) => a.memberId)).size };
    }),
  );

  const newMonthId = lastMonth ? nextMonthId(lastMonth.id) : monthOf(today);
  const lastSundays = lastMonth ? await getSundaysInMonth(lastMonth.id) : [];
  const firstLanguage = lastSundays.at(-1)?.language === "tl" ? "en" : "tl";
  const previousDecember = await getSundaysInMonth(`${currentYear}-12`);
  const firstYearLanguage = previousDecember.at(-1)?.language === "tl" ? "en" : "tl";

  return (
    <>
      <PageHeader eyebrow="Leader tools" title="Lineups">
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/lead/announcements" className={buttonClass("primary")}>Announcements</Link>
          <Link href="/lead/team" className={buttonClass("secondary")}>
            Team roster
          </Link>
          <Link href="/lead/notifications" className={buttonClass("secondary")}>Notifications</Link>
        </div>
      </PageHeader>

      {deletedLabel && <div role="status" className="mb-6"><Notice tone="ok">{deletedLabel} was deleted.</Notice></div>}
      <YearPlanner defaultYear={Number(currentYear) + 1} defaultLanguage={firstYearLanguage} />
      <form action="/lead" method="get" className="mb-6 max-w-xs">
        <label htmlFor="view-year" className={labelClass}>View year</label>
        <AutoSubmitSelect id="view-year" name="year" key={year} defaultValue={year} className={inputClass}>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </AutoSubmitSelect>
      </form>
      <div className="leader-grid">
        {details.map(({ month, sundays, replied }) => (
          <Card key={month.id} as="section">
            <div id={month.id} className="scroll-mt-6" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[21px] font-extrabold leading-tight">
                  {monthLabel(month.id)}
                </h2>
                {month.theme && <p className="font-semibold text-primary">{month.theme}</p>}
              </div>
              <Chip tone={month.availabilityOpen ? "ok" : "neutral"}>
                {month.availabilityOpen ? "Availability open" : "Availability closed"}
              </Chip>
            </div>

            <div className="mt-3 rounded-2xl bg-ground p-3">
              <p className="text-[15px]">
                <span className="font-bold">{replied}</span> of {activeCount} people replied
              </p>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-label="Replies"
                aria-valuemin={0}
                aria-valuemax={activeCount}
                aria-valuenow={replied}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${activeCount ? (replied / activeCount) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/lead/free?month=${month.id}`} className={buttonClass("soft")}>
                  Who&apos;s free
                </Link>
                <form action={setAvailabilityOpen}>
                  <input type="hidden" name="monthId" value={month.id} />
                  <input type="hidden" name="open" value={month.availabilityOpen ? "0" : "1"} />
                  <SubmitButton variant="secondary">
                    {month.availabilityOpen ? "Close availability" : "Open availability"}
                  </SubmitButton>
                </form>
              </div>
            </div>

            <ul className="mt-3 divide-y divide-line">
              {sundays.map((s) => {
                const checklist = lineupChecklist({
                  songCount: s.songs.filter((x) => !x.isBackup).length,
                  roles: s.people.map((p) => p.role),
                });
                const ready = checklist.filter((c) => c.done).length;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/lead/sunday/${s.date}`}
                      className="flex min-h-14 items-center gap-3 py-2"
                    >
                      <span className="w-16 flex-none font-display text-[17px] font-bold">
                        {shortDate(s.date)}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] text-muted">
                        {LANGUAGE_LABELS[s.language]} · {ready} of {checklist.length} ready
                      </span>
                      <StatusChip sunday={s} />
                      <ChevronRightIcon size={18} className="flex-none text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!sundays.length && <p className="mt-4 text-[14px] text-muted">No Sunday lineups in this month.</p>}

            <details className="mt-2">
              <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-bold text-primary">
                Edit theme and note
              </summary>
              <form action={updateMonth} className="mt-2 space-y-3">
                <input type="hidden" name="monthId" value={month.id} />
                <div>
                  <label htmlFor={`theme-${month.id}`} className={labelClass}>
                    Theme
                  </label>
                  <input
                    id={`theme-${month.id}`}
                    name="theme"
                    defaultValue={month.theme ?? ""}
                    placeholder="e.g. Sharing the Love"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`note-${month.id}`} className={labelClass}>
                    Note for the team
                  </label>
                  <input
                    id={`note-${month.id}`}
                    name="note"
                    defaultValue={month.note ?? ""}
                    placeholder="e.g. Quarterly Evaluation, Dec 19, 1:00 PM"
                    className={inputClass}
                  />
                </div>
                <SubmitButton variant="soft" pendingLabel="Saving…">
                  Save
                </SubmitButton>
              </form>
            </details>
            <DeleteLineup scope="month" target={month.id} label={monthLabel(month.id)} serviceIds={sundays.map(s => s.id)} />
          </Card>
        ))}

        <Card>
          <SectionTitle>Plan {monthLabel(newMonthId)}</SectionTitle>
          <p className="mb-3 text-[15px] text-muted">
            Adds every Sunday as a draft, alternating Tagalog and English, and opens availability.
          </p>
          <form action={createMonth} className="space-y-3">
            <input type="hidden" name="monthId" value={newMonthId} />
            <div>
              <label htmlFor="new-theme" className={labelClass}>
                Theme <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="new-theme" name="theme" className={inputClass} />
            </div>
            <div>
              <label htmlFor="first-language" className={labelClass}>
                First Sunday of {monthName(newMonthId)} is in
              </label>
              <select
                id="first-language"
                name="firstLanguage"
                defaultValue={firstLanguage}
                className={inputClass}
              >
                <option value="tl">Tagalog</option>
                <option value="en">English</option>
              </select>
            </div>
            <SubmitButton className="w-full" pendingLabel="Adding…">
              Add {monthName(newMonthId)}
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
