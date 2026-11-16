import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { rolesOf } from "@/components/sunday";
import { cx, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getMyAnswers, getMyNote, getSundaysInMonth, listMonths } from "@/lib/data";
import { monthName } from "@/lib/dates";
import { getToday } from "@/lib/today";
import { MY_ROLE_LABELS } from "@/lib/lineup";
import { AvailabilityForm } from "./availability-form";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilityPage(props: PageProps<"/availability">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Availability searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Availability({
  searchParams,
}: {
  searchParams: PageProps<"/availability">["searchParams"];
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const today = await getToday();
  const open = (await listMonths()).filter((m) => m.availabilityOpen);

  const withSundays = await Promise.all(
    open.map(async (month) => ({
      month,
      sundays: (await getSundaysInMonth(month.id)).filter((s) => s.date >= today),
    })),
  );
  const choices = withSundays.filter((m) => m.sundays.length > 0);
  const chosen = choices.find((c) => c.month.id === params.month) ?? choices[0];

  if (!chosen) {
    return (
      <>
        <PageHeader eyebrow="Availability" title="Nothing to mark right now" />
        <EmptyState title="No month is open yet">
          When leaders open the next month, you can mark your Sundays here.
        </EmptyState>
      </>
    );
  }

  const { month, sundays } = chosen;
  const answers = await getMyAnswers(viewer.id, sundays.map((s) => s.id));
  const note = await getMyNote(viewer.id, month.id);
  const defaultOpenTo = [
    ...(viewer.sings ? ["backup"] : []),
    ...(viewer.instruments.length ? ["band"] : []),
  ];

  return (
    <>
      <PageHeader eyebrow="Availability" title={`${monthName(month.id)} Sundays`}>
        <p className="mt-1 text-[15px] text-muted">
          Tell the leaders which Sundays you can serve. You can change this any time.
        </p>
      </PageHeader>

      {choices.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Month">
          {choices.map((c) => (
            <Link
              key={c.month.id}
              href={`/availability?month=${c.month.id}`}
              aria-current={c.month.id === month.id ? "true" : undefined}
              className={cx(
                "flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold",
                c.month.id === month.id ? "bg-primary text-white" : "bg-card text-muted border border-line",
              )}
            >
              {monthName(c.month.id)}
            </Link>
          ))}
        </div>
      )}

      <AvailabilityForm
        key={month.id}
        monthId={month.id}
        sundays={sundays.map((s) => ({
          id: s.id,
          date: s.date,
          language: s.language,
          occasion: s.occasion,
          myRoles: rolesOf(s, viewer.id).map((r) => MY_ROLE_LABELS[r]),
        }))}
        initial={{
          answers: Object.fromEntries(answers),
          openTo: note?.openTo ?? defaultOpenTo,
          tryLead: note?.tryLead ?? false,
          songIdea: note?.songIdea ?? "",
        }}
      />
    </>
  );
}
