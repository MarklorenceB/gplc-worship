import Link from "next/link";
import { Suspense } from "react";
import { MyRoleChips, rolesOf, SundayCard } from "@/components/sunday";
import {
  buttonClass,
  Card,
  Chip,
  DateBlock,
  EmptyState,
  PageHeader,
  PageSkeleton,
  SectionTitle,
} from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getMyAnswers, getSundaysBetween, listMonths } from "@/lib/data";
import { LANGUAGE_LABELS, longDate, monthName } from "@/lib/dates";
import { getToday } from "@/lib/today";
import { getDb } from "@/lib/db/client";
import { listAnnouncements } from "@/lib/announcements";
import { AnnouncementCard } from "@/components/announcements";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const viewer = await requireViewer();
  const today = await getToday();
  const upcoming = await getSundaysBetween(today, "9999-12-31");
  const mine = upcoming.filter((s) => rolesOf(s, viewer.id).length > 0);
  const next = mine[0];
  const thisSunday = upcoming[0];
  const [latestAnnouncement] = await listAnnouncements(await getDb(), { limit: 1 });

  const openMonths = (await listMonths())
    .filter((m) => m.availabilityOpen)
    .map((m) => ({ month: m, sundays: upcoming.filter((s) => s.monthId === m.id) }))
    .filter((m) => m.sundays.length > 0);
  const answers = await getMyAnswers(
    viewer.id,
    openMonths.flatMap((m) => m.sundays.map((s) => s.id)),
  );

  const unanswered = openMonths.reduce(
    (count, { sundays }) => count + sundays.filter((s) => !answers.has(s.id)).length,
    0,
  );

  return (
    <>
      <PageHeader eyebrow={longDate(today)} title={`Hi, ${viewer.name}.`}>
        <p className="text-[15px] text-muted">A little preparation. A wholehearted Sunday.</p>
      </PageHeader>
      <section className="mb-6" aria-label="Team announcements">
        <SectionTitle aside={<Link href="/announcements" className="text-[14px] font-semibold text-primary">View all →</Link>}>From our leaders</SectionTitle>
        {latestAnnouncement ? <AnnouncementCard announcement={latestAnnouncement} compact />
          : <Card><p className="text-[14px] text-muted">Team announcements will appear here.</p>
            {viewer.leader && <Link href="/lead/announcements" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary">Write an announcement →</Link>}
          </Card>}
      </section>
      <div className="home-stats">
        <Link href="/schedule?mine=1" className="home-stat"><strong>{mine.length}</strong><span>Upcoming Sundays<br />on your lineup</span></Link>
        <Link href="/availability" className="home-stat"><strong>{unanswered}</strong><span>Availability answers<br />still to send</span></Link>
      </div>

      <div className="home-grid">
        <div className="home-primary">
          {next ? (
            <section className="home-hero">
              <p className="home-hero-label">
                Your next Sunday
              </p>
              <div className="mt-3 flex items-center gap-3">
                <DateBlock date={next.date} tone="dark" />
                <div>
                  <p className="font-display text-[22px] font-extrabold leading-tight">
                    {longDate(next.date)}
                  </p>
                  <p className="text-[15px] text-white/80">
                    {LANGUAGE_LABELS[next.language]}
                    {next.month.theme && ` · ${next.month.theme}`}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <MyRoleChips roles={rolesOf(next, viewer.id)} />
              </div>
              {next.palette && (
                <p className="mt-3 text-[15px]">
                  <span className="text-white/70">Wear</span>{" "}
                  <span className="font-semibold">{next.palette}</span>
                </p>
              )}
              {next.status === "draft" && (
                <p className="mt-2 text-[14px] text-white/70">Still being planned. It may change.</p>
              )}
              <Link
                href={`/sunday/${next.date}`}
                className={buttonClass("secondary", "hero-action w-full border-0")}
              >
                See the full lineup
              </Link>
            </section>
          ) : (
            <EmptyState title="You're not on a lineup yet">
              When a leader adds you to a Sunday, it shows up here.
            </EmptyState>
          )}

          {mine.length > 1 && (
            <section className="home-section">
              <SectionTitle
                aside={
                  <Link href="/schedule?mine=1" className="text-[15px] font-semibold text-primary">
                    See all
                  </Link>
                }
              >
                Coming up for you
              </SectionTitle>
              <ul className="space-y-3">
                {mine.slice(1, 5).map((s) => (
                  <SundayCard key={s.id} sunday={s} viewerId={viewer.id} />
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="home-aside">
          {openMonths.map(({ month, sundays }) => {
            const answered = sundays.filter((s) => answers.has(s.id)).length;
            const done = answered === sundays.length;
            return (
              <Card key={month.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-[19px] font-bold leading-tight">
                    {monthName(month.id)} availability is open
                  </h2>
                  {done ? <Chip tone="ok">Sent</Chip> : <Chip tone="warn">To do</Chip>}
                </div>
                <p className="mt-1 text-[15px] text-muted">
                  {done
                    ? "Thanks! You can still change your answers."
                    : `You've answered ${answered} of ${sundays.length} Sundays. It helps leaders plan early.`}
                </p>
                <progress className="home-progress" value={answered} max={sundays.length} aria-label={`${monthName(month.id)} availability answered`} />
                <Link
                  href={`/availability?month=${month.id}`}
                  className={buttonClass(done ? "soft" : "primary", "mt-3 w-full")}
                >
                  {done ? "Change my answers" : "Mark my Sundays"}
                </Link>
              </Card>
            );
          })}

          {thisSunday && thisSunday.id !== next?.id && (
            <section>
              <SectionTitle>This Sunday</SectionTitle>
              <ul>
                <SundayCard sunday={thisSunday} viewerId={viewer.id} />
              </ul>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
