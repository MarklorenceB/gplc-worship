import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/client";
import { lineupText, MyRoleChips, rolesOf, StatusChip } from "@/components/sunday";
import {
  buttonClass,
  Card,
  Chip,
  cx,
  PageHeader,
  PageSkeleton,
  SectionTitle,
} from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getSunday, type Song } from "@/lib/data";
import { LANGUAGE_LABELS, longDate, shortDate } from "@/lib/dates";
import { BAND_SLOTS, ROLE_LABELS, VOCAL_ROLES } from "@/lib/lineup";

export async function generateMetadata(props: PageProps<"/sunday/[date]">): Promise<Metadata> {
  const { date } = await props.params;
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(date) ? shortDate(date) : "Sunday" };
}

export default function SundayPage(props: PageProps<"/sunday/[date]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SundayLineup params={props.params} />
    </Suspense>
  );
}

async function SundayLineup({ params }: { params: PageProps<"/sunday/[date]">["params"] }) {
  const viewer = await requireViewer();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const sunday = await getSunday(date);
  if (!sunday) notFound();

  const mine = rolesOf(sunday, viewer.id);
  const people = (role: (typeof sunday.people)[number]["role"]) =>
    sunday.people.filter((p) => p.role === role);

  return (
    <>
      <PageHeader
        back={{ href: `/schedule?month=${sunday.monthId}`, label: "Schedule" }}
        eyebrow={sunday.month.theme ?? undefined}
        title={longDate(sunday.date)}
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tone="primary">{LANGUAGE_LABELS[sunday.language]}</Chip>
          <StatusChip sunday={sunday} />
          {sunday.occasion && <Chip tone="primary">{sunday.occasion}</Chip>}
        </div>
      </PageHeader>

      <div className="screen-grid">
        {mine.length > 0 && (
          <section className="grid-full rounded-3xl bg-you/60 p-4">
            <p className="text-[14px] font-bold">You&apos;re serving</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <MyRoleChips roles={mine} />
            </div>
          </section>
        )}

        {sunday.status === "draft" && (
          <p className="grid-full rounded-2xl bg-warn-soft px-4 py-3 text-[15px] font-semibold text-warn">
            Still being planned. Names and songs may change.
          </p>
        )}

        {(sunday.palette || sunday.notes) && (
          <Card className="grid-full">
            {sunday.palette && (
              <p className="text-[16px]">
                <span className="font-bold">Wear:</span> {sunday.palette}
              </p>
            )}
            {sunday.notes && (
              <p className={cx("whitespace-pre-line text-[15px] text-muted", sunday.palette && "mt-2")}>
                {sunday.notes}
              </p>
            )}
          </Card>
        )}

        <Card>
          <SectionTitle>Songs</SectionTitle>
          <SongList songs={sunday.songs} />
        </Card>

        <Card>
          <SectionTitle>Vocalists</SectionTitle>
          <div className="space-y-3">
            {VOCAL_ROLES.map((role) => (
              <PeopleRow key={role} label={ROLE_LABELS[role]} labelClass={role === "joyful" ? "text-joy" : role === "solemn" ? "text-sol" : "text-back"}>
                {people(role).map((p) => (
                  <Chip key={p.assignmentId} tone={p.memberId === viewer.id ? "you" : role === "joyful" ? "joy" : role === "solemn" ? "sol" : "back"}>
                    {p.name}
                  </Chip>
                ))}
              </PeopleRow>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Band and sound</SectionTitle>
          <dl className="grid grid-cols-2 gap-2">
            {BAND_SLOTS.map((slot) => {
              const names = people(slot);
              return (
                <div key={slot} className="rounded-2xl bg-ground px-3 py-2.5">
                  <dt className="text-[12px] font-bold uppercase tracking-wider text-muted">
                    {slot} · {ROLE_LABELS[slot]}
                  </dt>
                  <dd className="mt-0.5 text-[16px] font-semibold">
                    {names.length ? (
                      names.map((p) => (
                        <span
                          key={p.assignmentId}
                          className={cx(p.memberId === viewer.id && "rounded bg-you px-1")}
                        >
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span className="font-normal text-muted">Not set</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>

        <Card>
          <SectionTitle>Devotion and soaking</SectionTitle>
          <div className="space-y-3">
            {(["devotion", "soaking"] as const).map((role) => (
              <PeopleRow key={role} label={ROLE_LABELS[role]} labelClass="text-ok">
                {people(role).map((p) => (
                  <Chip key={p.assignmentId} tone={p.memberId === viewer.id ? "you" : "ok"}>
                    {p.name}
                  </Chip>
                ))}
              </PeopleRow>
            ))}
          </div>
        </Card>

        <CopyButton text={lineupText(sunday)} className="w-full">
          Copy lineup for the group chat
        </CopyButton>

        {viewer.leader && (
          <Link href={`/lead/sunday/${sunday.date}`} className={buttonClass("primary", "w-full")}>
            Edit this lineup
          </Link>
        )}
      </div>
    </>
  );
}

function PeopleRow({
  label,
  labelClass,
  children,
}: {
  label: string;
  labelClass: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="flex gap-3">
      <p className={cx("w-20 flex-none pt-1 text-[14px] font-bold", labelClass)}>{label}</p>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {children.length ? children : <span className="pt-1 text-[15px] text-muted">Not set</span>}
      </div>
    </div>
  );
}

function SongList({ songs }: { songs: Song[] }) {
  const main = songs.filter((s) => !s.isBackup);
  const backups = songs.filter((s) => s.isBackup);
  if (!songs.length) return <p className="text-[15px] text-muted">Songs not picked yet.</p>;

  const grouped = main.some((s) => s.set);
  const groups = grouped
    ? [
        { label: "Joyful set", tone: "text-joy", songs: main.filter((s) => s.set === "joyful") },
        { label: "Solemn set", tone: "text-sol", songs: main.filter((s) => s.set === "solemn") },
        { label: "Other songs", tone: "text-muted", songs: main.filter((s) => !s.set) },
      ].filter((g) => g.songs.length)
    : [{ label: null, tone: "", songs: main }];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label ?? "all"}>
          {group.label && (
            <p className={cx("mb-1.5 text-[13px] font-bold uppercase tracking-wider", group.tone)}>
              {group.label}
            </p>
          )}
          <ol className="space-y-1.5">
            {group.songs.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </ol>
        </div>
      ))}
      {backups.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-muted">
            Backup song
          </p>
          <ol className="space-y-1.5">
            {backups.map((song) => (
              <SongRow key={song.id} song={song} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SongRow({ song }: { song: Song }) {
  return (
    <li className="rounded-2xl bg-ground px-3 py-2.5">
      <p className="text-[16px] font-semibold leading-snug">{song.title}</p>
      {song.artist && <p className="text-[14px] text-muted">{song.artist}</p>}
    </li>
  );
}
