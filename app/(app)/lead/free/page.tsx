import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { OPEN_TO_LABELS } from "@/app/(app)/availability/options";
import { CopyButton } from "@/components/client";
import { rolesOf } from "@/components/sunday";
import {
  buttonClass,
  Card,
  Chip,
  cx,
  EmptyState,
  PageHeader,
  PageSkeleton,
  SectionTitle,
  type Tone,
} from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import {
  getAnswers,
  getMonthNotes,
  getServeCounts,
  getSundaysInMonth,
  listMembers,
  listMonths,
  pickMonth,
  type Member,
} from "@/lib/data";
import { monthName, shortDate } from "@/lib/dates";
import { getToday } from "@/lib/today";
import { HEAVY_MONTH, ROLE_LABELS, type Answer } from "@/lib/lineup";

export const metadata: Metadata = { title: "Who's free" };

export default function FreePage(props: PageProps<"/lead/free">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Free searchParams={props.searchParams} />
    </Suspense>
  );
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function Free({ searchParams }: { searchParams: PageProps<"/lead/free">["searchParams"] }) {
  await requireLeader();
  const params = await searchParams;
  const today = await getToday();
  const months = await listMonths();
  const month = months.find((m) => m.id === params.month) ?? pickMonth(months, today);
  if (!month) {
    return <EmptyState title="No months yet">Add a month on the Lead page first.</EmptyState>;
  }
  const previous = months[months.indexOf(month) - 1];

  const sundays = await getSundaysInMonth(month.id);
  const selected =
    sundays.find((s) => s.date === params.date) ??
    sundays.find((s) => s.date >= today) ??
    sundays[0];
  const people = (await listMembers()).filter((m) => m.active);
  const answers = await getAnswers(sundays.map((s) => s.id));
  const notes = new Map((await getMonthNotes(month.id)).map((n) => [n.memberId, n]));
  const thisMonth = await getServeCounts(month.id);
  const lastMonth = previous ? await getServeCounts(previous.id) : new Map<number, number>();

  const replied = new Set(answers.map((a) => a.memberId));
  const waiting = people.filter((m) => !replied.has(m.id));
  const link = `${await origin()}/availability?month=${month.id}`;
  const reminder = [
    `Hi team! Please mark your ${monthName(month.id)} availability in the app:`,
    link,
    waiting.length ? `\nStill waiting on: ${waiting.map((m) => m.name).join(", ")}` : "",
  ]
    .join("\n")
    .trim();

  const answerFor = (memberId: number, serviceId: number) =>
    answers.find((a) => a.memberId === memberId && a.serviceId === serviceId)?.answer;
  const freeCount = (serviceId: number) =>
    answers.filter((a) => a.serviceId === serviceId && a.answer === "yes").length;

  const byAnswer = (answer: Answer | undefined) =>
    selected ? people.filter((m) => answerFor(m.id, selected.id) === answer) : [];
  const rested = (m: Member) =>
    [thisMonth.get(m.id) ?? 0, lastMonth.get(m.id) ?? 0, m.name] as const;
  const canServe = byAnswer("yes").sort((a, b) => {
    const [ta, la, na] = rested(a);
    const [tb, lb, nb] = rested(b);
    return ta - tb || la - lb || na.localeCompare(nb);
  });

  return (
    <>
      <PageHeader
        back={{ href: `/lead?year=${month.id.slice(0, 4)}#${month.id}`, label: "Lineups" }}
        eyebrow="Who's free"
        title={`${monthName(month.id)} Sundays`}
      />

      <div className="screen-grid">
        <Card className="grid-full">
          <p className="text-[16px]">
            <span className="font-display text-[22px] font-extrabold">{replied.size}</span> of{" "}
            {people.length} people replied
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${people.length ? (replied.size / people.length) * 100 : 0}%` }}
            />
          </div>
          {!month.availabilityOpen && (
            <p className="mt-2 text-[14px] text-warn">
              Availability is closed for this month, so members can&apos;t answer.
            </p>
          )}
          {waiting.length > 0 && (
            <CopyButton
              text={reminder}
              variant="soft"
              className="mt-3 w-full"
              copiedLabel="Copied. Paste it in the group chat."
            >
              Copy a reminder for the {waiting.length} who haven&apos;t replied
            </CopyButton>
          )}
        </Card>

        {selected ? (
          <>
            <nav aria-label="Sunday" className="grid-full -mx-4 overflow-x-auto px-4">
              <ul className="flex gap-2">
                {sundays.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/lead/free?month=${month.id}&date=${s.date}`}
                      aria-current={s.id === selected.id ? "true" : undefined}
                      className={cx(
                        "flex min-h-14 min-w-20 flex-col items-center justify-center whitespace-nowrap rounded-2xl border px-3",
                        s.id === selected.id
                          ? "border-primary bg-primary text-white"
                          : "border-line bg-card",
                      )}
                    >
                      <span className="font-display text-[16px] font-bold">{shortDate(s.date)}</span>
                      <span className="text-[12px] font-semibold opacity-80">
                        {freeCount(s.id)} free
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Card>
              <SectionTitle aside={<span className="text-[14px] text-muted">Fewest Sundays first</span>}>
                Can serve
              </SectionTitle>
              {canServe.length ? (
                <ul className="divide-y divide-line">
                  {canServe.map((m) => {
                    const [inMonth, inLast] = rested(m);
                    const note = notes.get(m.id);
                    const here = rolesOf(selected, m.id);
                    const load: { tone: Tone; label: string } =
                      inMonth >= HEAVY_MONTH - 1
                        ? { tone: "warn", label: `${inMonth} Sundays this month` }
                        : inMonth > 0
                          ? { tone: "neutral", label: `${inMonth} this month` }
                          : { tone: "ok", label: "Free all month so far" };
                    return (
                      <li key={m.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-[16px] font-bold">{m.name}</span>
                          <Chip tone={load.tone}>{load.label}</Chip>
                          {previous && (
                            <Chip>
                              {inLast
                                ? `${monthName(previous.id).slice(0, 3)}: ${inLast}×`
                                : `Rested in ${monthName(previous.id).slice(0, 3)}`}
                            </Chip>
                          )}
                          {here.map((r) => (
                            <Chip key={r} tone="primary">
                              On this Sunday: {ROLE_LABELS[r]}
                            </Chip>
                          ))}
                        </div>
                        {note && (note.openTo.length > 0 || note.tryLead || note.songIdea) && (
                          <p className="mt-1 text-[14px] text-muted">
                            {note.openTo.length > 0 &&
                              `Open to ${note.openTo.map((v) => OPEN_TO_LABELS[v]?.toLowerCase() ?? v).join(", ")}. `}
                            {note.tryLead && <strong className="text-primary">Wants to try leading. </strong>}
                            {note.songIdea && `Song idea: ${note.songIdea}`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[15px] text-muted">Nobody has said yes for this Sunday yet.</p>
              )}
            </Card>

            <NameGroup title="Not sure" tone="warn" people={byAnswer("maybe")} />
            <NameGroup title="Can't" tone="danger" people={byAnswer("no")} />
            <NameGroup title="No reply yet" tone="neutral" people={byAnswer(undefined)} />

            <Link href={`/lead/sunday/${selected.date}`} className={buttonClass("primary", "grid-full w-full")}>
              Build the {shortDate(selected.date)} lineup
            </Link>
          </>
        ) : (
          <EmptyState title="No Sundays in this month" />
        )}
      </div>
    </>
  );
}

function NameGroup({ title, tone, people }: { title: string; tone: Tone; people: Member[] }) {
  if (!people.length) return null;
  return (
    <Card>
      <SectionTitle aside={<span className="text-[14px] text-muted">{people.length}</span>}>
        {title}
      </SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {people.map((m) => (
          <Chip key={m.id} tone={tone}>
            {m.name}
          </Chip>
        ))}
      </div>
    </Card>
  );
}
