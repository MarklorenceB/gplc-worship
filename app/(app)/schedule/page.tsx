import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { AutoSubmitSelect } from "@/components/client";
import { rolesOf, SundayCard } from "@/components/sunday";
import { cx, EmptyState, inputClass, labelClass, PageHeader, PageSkeleton } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getSundaysInMonth, listMonths, pickMonth } from "@/lib/data";
import { monthLabel } from "@/lib/dates";
import { getToday } from "@/lib/today";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage(props: PageProps<"/schedule">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Schedule searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Schedule({ searchParams }: { searchParams: PageProps<"/schedule">["searchParams"] }) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const months = await listMonths();
  const month = months.find((m) => m.id === params.month) ?? pickMonth(months, await getToday());
  if (!month) {
    return (
      <>
        <PageHeader title="Schedule" />
        <EmptyState title="Nothing planned yet">Leaders haven&apos;t added any months.</EmptyState>
      </>
    );
  }

  const index = months.indexOf(month);
  const prev = months[index - 1];
  const next = months[index + 1];
  const mineOnly = params.mine === "1";
  const sundays = await getSundaysInMonth(month.id);
  const shown = mineOnly ? sundays.filter((s) => rolesOf(s, viewer.id).length > 0) : sundays;
  const href = (monthId: string, mine: boolean) =>
    `/schedule?month=${monthId}${mine ? "&mine=1" : ""}`;

  return (
    <>
      <PageHeader eyebrow="Schedule" title={monthLabel(month.id)}>
        {month.theme && (
          <p className="mt-1 font-display text-[18px] font-bold text-primary">{month.theme}</p>
        )}
        {month.note && <p className="mt-1 text-[15px] text-muted">{month.note}</p>}
      </PageHeader>

      <form action="/schedule" method="get" className="mb-5 max-w-sm">
        <label htmlFor="schedule-month" className={labelClass}>Jump to month</label>
        {mineOnly && <input type="hidden" name="mine" value="1" />}
        <AutoSubmitSelect id="schedule-month" name="month" key={month.id} defaultValue={month.id} className={inputClass}>
          {months.map((m) => <option key={m.id} value={m.id}>{monthLabel(m.id)}</option>)}
        </AutoSubmitSelect>
      </form>
      <div className="schedule-toolbar">
        <MonthLink href={prev && href(prev.id, mineOnly)} label="Previous month">
          <ChevronLeftIcon />
        </MonthLink>
        <div className="flex flex-1 rounded-2xl bg-back-soft p-1" role="group" aria-label="Show">
          {[
            { mine: false, label: "All Sundays" },
            { mine: true, label: "Only mine" },
          ].map((option) => (
            <Link
              key={option.label}
              href={href(month.id, option.mine)}
              aria-current={option.mine === mineOnly ? "true" : undefined}
              className={cx(
                "flex min-h-11 flex-1 items-center justify-center rounded-xl text-[15px] font-bold",
                option.mine === mineOnly ? "bg-card text-ink shadow-sm" : "text-muted",
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <MonthLink href={next && href(next.id, mineOnly)} label="Next month">
          <ChevronRightIcon />
        </MonthLink>
      </div>

      <p className="schedule-caption"><span>{shown.length} Sunday{shown.length === 1 ? "" : "s"}{mineOnly ? " on your lineup" : " this month"}</span><span>Tap a Sunday for the lineup</span></p>

      {shown.length ? (
        <ul className="sunday-grid">
          {shown.map((s) => (
            <SundayCard key={s.id} sunday={s} viewerId={viewer.id} />
          ))}
        </ul>
      ) : (
        <EmptyState title={mineOnly ? "You're not serving this month" : "No Sundays this month"}>
          {mineOnly && "Mark your availability so leaders know when you're free."}
        </EmptyState>
      )}
    </>
  );
}

function MonthLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-line bg-card";
  if (!href) {
    return (
      <span aria-hidden="true" className={cx(className, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cx(className, "text-primary")}>
      {children}
    </Link>
  );
}
