import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoSubmitSelect, CopyButton, SubmitButton } from "@/components/client";
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, CheckIcon, XIcon } from "@/components/icons";
import { lineupText, StatusChip } from "@/components/sunday";
import {
  Card,
  Chip,
  cx,
  inputClass,
  labelClass,
  Notice,
  PageHeader,
  PageSkeleton,
  SectionTitle,
} from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { getSunday, listMembers, type Member, type Sunday } from "@/lib/data";
import { LANGUAGE_LABELS, longDate, shortDate } from "@/lib/dates";
import {
  BAND_SLOTS,
  ROLE_LABELS,
  VOCAL_ROLES,
  type Answer,
  type BandSlot,
  type Role,
} from "@/lib/lineup";
import { reviewSunday } from "@/lib/review";
import { DeleteLineup } from "../../delete-lineup";
import {
  addPerson,
  addSong,
  moveSong,
  removePerson,
  removeSong,
  setSlot,
  setSongPart,
  setStatus,
  updateSundayDetails,
} from "../../actions";

export async function generateMetadata(props: PageProps<"/lead/sunday/[date]">): Promise<Metadata> {
  const { date } = await props.params;
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(date) ? `Build ${shortDate(date)}` : "Build" };
}

export default function BuilderPage(props: PageProps<"/lead/sunday/[date]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Builder params={props.params} />
    </Suspense>
  );
}

type Review = Awaited<ReturnType<typeof reviewSunday>>;

type Context = {
  sunday: Sunday;
  members: Member[];
  answers: Map<number, Answer>;
  monthCounts: Map<number, number>;
};

async function Builder({ params }: { params: PageProps<"/lead/sunday/[date]">["params"] }) {
  await requireLeader();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const sunday = await getSunday(date);
  if (!sunday) notFound();
  const review = await reviewSunday(sunday);
  const members = (await listMembers()).filter(
    (m) => m.active || sunday.people.some((p) => p.memberId === m.id),
  );
  const ctx: Context = { sunday, members, answers: review.answers, monthCounts: review.monthCounts };

  return (
    <>
      <PageHeader
        back={{ href: `/lead?year=${sunday.monthId.slice(0, 4)}#${sunday.monthId}`, label: "Lineups" }}
        eyebrow="Build the lineup"
        title={longDate(sunday.date)}
      >
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip tone="primary">{LANGUAGE_LABELS[sunday.language]}</Chip>
          <StatusChip sunday={sunday} />
          <Link
            href={`/lead/free?month=${sunday.monthId}&date=${sunday.date}`}
            className="ml-auto inline-flex min-h-11 items-center text-[15px] font-bold text-primary"
          >
            Who&apos;s free
          </Link>
        </div>
      </PageHeader>

      <div className="builder-grid">
        <ReviewCard review={review} />
        <SongsCard sunday={sunday} />
        <Card>
          <SectionTitle>Vocalists</SectionTitle>
          <div className="space-y-5">
            {VOCAL_ROLES.map((role) => (
              <RoleBlock key={role} role={role} ctx={ctx} />
            ))}
          </div>
        </Card>
        <BandCard ctx={ctx} />
        <Card>
          <SectionTitle>Devotion and soaking</SectionTitle>
          <div className="space-y-5">
            <RoleBlock role="devotion" ctx={ctx} />
            <RoleBlock role="soaking" ctx={ctx} />
          </div>
        </Card>
        <DetailsCard sunday={sunday} />
        <PublishCard sunday={sunday} review={review} />
      </div>
      <Card className="mt-6">
        <SectionTitle>Remove this lineup</SectionTitle>
        <p className="text-[14px] text-muted">Delete an old or unused Sunday from the team&apos;s schedule.</p>
        <DeleteLineup scope="sunday" target={sunday.date} serviceId={sunday.id} label={`${longDate(sunday.date)}, ${sunday.date.slice(0, 4)}`} />
      </Card>
    </>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const { checklist, issues } = review;
  return (
    <Card>
      <SectionTitle>Check</SectionTitle>
      <ul className="grid grid-cols-2 gap-2">
        {checklist.map((item) => (
          <li
            key={item.label}
            className={cx(
              "flex min-h-11 items-center gap-2 rounded-2xl px-3 text-[15px] font-semibold",
              item.done ? "bg-ok-soft text-ok" : "bg-ground text-muted",
            )}
          >
            {item.done ? <CheckIcon size={18} /> : <span className="h-[18px] w-[18px] rounded-full border-2 border-current" />}
            {item.label}
            <span className="sr-only">{item.done ? "done" : "missing"}</span>
          </li>
        ))}
      </ul>
      {issues.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {issues.map((issue) => (
            <li
              key={`${issue.kind}-${issue.memberId}`}
              className={cx(
                "flex gap-2 rounded-2xl px-3 py-2.5 text-[15px] font-semibold",
                issue.level === "error" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn",
              )}
            >
              <AlertIcon size={20} className="mt-0.5 flex-none" />
              {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[15px] text-ok">No clashes or overloaded people.</p>
      )}
    </Card>
  );
}

function SongsCard({ sunday }: { sunday: Sunday }) {
  const partOf = (s: Sunday["songs"][number]) => (s.isBackup ? "backup" : (s.set ?? "none"));
  return (
    <Card>
      <SectionTitle>Songs</SectionTitle>
      {sunday.songs.length > 0 ? (
        <ol className="space-y-2">
          {sunday.songs.map((song, i) => (
            <li key={song.id} className="rounded-2xl bg-ground p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-snug">{song.title}</p>
                  {song.artist && <p className="text-[14px] text-muted">{song.artist}</p>}
                </div>
                <form action={moveSong}>
                  <input type="hidden" name="songId" value={song.id} />
                  <input type="hidden" name="direction" value="up" />
                  <IconButton label={`Move ${song.title} up`} disabled={i === 0}>
                    <ArrowUpIcon size={18} />
                  </IconButton>
                </form>
                <form action={moveSong}>
                  <input type="hidden" name="songId" value={song.id} />
                  <input type="hidden" name="direction" value="down" />
                  <IconButton label={`Move ${song.title} down`} disabled={i === sunday.songs.length - 1}>
                    <ArrowDownIcon size={18} />
                  </IconButton>
                </form>
                <form action={removeSong}>
                  <input type="hidden" name="songId" value={song.id} />
                  <IconButton label={`Remove ${song.title}`}>
                    <XIcon size={18} />
                  </IconButton>
                </form>
              </div>
              <form action={setSongPart} key={`${song.id}-${partOf(song)}`} className="mt-2">
                <input type="hidden" name="songId" value={song.id} />
                <label className="sr-only" htmlFor={`part-${song.id}`}>
                  Part of the service for {song.title}
                </label>
                <AutoSubmitSelect
                  id={`part-${song.id}`}
                  name="part"
                  defaultValue={partOf(song)}
                  className={cx(inputClass, "bg-card")}
                >
                  <PartOptions />
                </AutoSubmitSelect>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[15px] text-muted">No songs yet.</p>
      )}

      <form action={addSong} className="mt-4 space-y-3 border-t border-line pt-4">
        <input type="hidden" name="serviceId" value={sunday.id} />
        <p className="font-bold">Add a song</p>
        <div>
          <label htmlFor="song-title" className={labelClass}>
            Title
          </label>
          <input id="song-title" name="title" required className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="song-artist" className={labelClass}>
              Artist <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="song-artist" name="artist" className={inputClass} />
          </div>
          <div>
            <label htmlFor="song-part" className={labelClass}>
              Part
            </label>
            <select id="song-part" name="part" defaultValue="none" className={inputClass}>
              <PartOptions />
            </select>
          </div>
        </div>
        <SubmitButton variant="soft" className="w-full" pendingLabel="Adding…">
          Add song
        </SubmitButton>
      </form>
    </Card>
  );
}

function PartOptions() {
  return (
    <>
      <option value="none">No set</option>
      <option value="joyful">Joyful set</option>
      <option value="solemn">Solemn set</option>
      <option value="backup">Backup song</option>
    </>
  );
}

function IconButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const ANSWER_GROUPS: { answer: Answer | undefined; label: string }[] = [
  { answer: "yes", label: "Can serve" },
  { answer: undefined, label: "No reply yet" },
  { answer: "maybe", label: "Not sure" },
  { answer: "no", label: "Can't" },
];

function candidateLabel(m: Member, ctx: Context) {
  const count = ctx.monthCounts.get(m.id) ?? 0;
  const load = count ? `${count} Sunday${count === 1 ? "" : "s"} this month` : "none yet this month";
  const here = ctx.sunday.people.some((p) => p.memberId === m.id) ? ", already on this Sunday" : "";
  return `${m.name} · ${load}${here}`;
}

function CandidateGroups({ people, ctx }: { people: Member[]; ctx: Context }) {
  const sorted = [...people].sort(
    (a, b) =>
      (ctx.monthCounts.get(a.id) ?? 0) - (ctx.monthCounts.get(b.id) ?? 0) ||
      a.name.localeCompare(b.name),
  );
  return (
    <>
      {ANSWER_GROUPS.map((group) => {
        const list = sorted.filter((m) => ctx.answers.get(m.id) === group.answer);
        if (!list.length) return null;
        return (
          <optgroup key={group.label} label={group.label}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {candidateLabel(m, ctx)}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

const PERSON_BUTTON: Record<Exclude<Role, BandSlot>, string> = {
  joyful: "bg-joy-soft text-joy",
  solemn: "bg-sol-soft text-sol",
  backup: "bg-back-soft text-back",
  devotion: "bg-ok-soft text-ok",
  soaking: "bg-ok-soft text-ok",
};

function RoleBlock({ role, ctx }: { role: Exclude<Role, BandSlot>; ctx: Context }) {
  const assigned = ctx.sunday.people.filter((p) => p.role === role);
  const assignedIds = new Set(assigned.map((p) => p.memberId));
  const vocal = (VOCAL_ROLES as readonly string[]).includes(role);
  const candidates = ctx.members.filter(
    (m) => m.active && !assignedIds.has(m.id) && (!vocal || m.sings),
  );

  return (
    <div>
      <p className="mb-2 text-[15px] font-bold">{ROLE_LABELS[role]}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {assigned.length ? (
          assigned.map((p) => (
            <form key={p.assignmentId} action={removePerson}>
              <input type="hidden" name="assignmentId" value={p.assignmentId} />
              <button
                type="submit"
                aria-label={`Remove ${p.name} from ${ROLE_LABELS[role]}`}
                className={cx(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full pl-3.5 pr-2.5 text-[15px] font-semibold",
                  PERSON_BUTTON[role],
                )}
              >
                {p.name}
                <XIcon size={16} />
              </button>
            </form>
          ))
        ) : (
          <span className="text-[15px] text-muted">Nobody yet</span>
        )}
      </div>
      {candidates.length > 0 && (
        <form action={addPerson} key={assigned.map((p) => p.memberId).join("-")}>
          <input type="hidden" name="serviceId" value={ctx.sunday.id} />
          <input type="hidden" name="role" value={role} />
          <label htmlFor={`add-${role}`} className="sr-only">
            Add someone to {ROLE_LABELS[role]}
          </label>
          <AutoSubmitSelect id={`add-${role}`} name="memberId" defaultValue="" className={inputClass}>
            <option value="" disabled>
              Add someone…
            </option>
            <CandidateGroups people={candidates} ctx={ctx} />
          </AutoSubmitSelect>
        </form>
      )}
    </div>
  );
}

function BandCard({ ctx }: { ctx: Context }) {
  return (
    <Card>
      <SectionTitle>Band and sound</SectionTitle>
      <div className="space-y-3">
        {BAND_SLOTS.map((slot) => {
          const current = ctx.sunday.people.find((p) => p.role === slot);
          const plays = ctx.members.filter(
            (m) => m.active && m.instruments.includes(slot) && m.id !== current?.memberId,
          );
          const others = ctx.members.filter(
            (m) => m.active && !m.instruments.includes(slot) && m.id !== current?.memberId,
          );
          return (
            <form key={`${slot}-${current?.memberId ?? "none"}`} action={setSlot}>
              <input type="hidden" name="serviceId" value={ctx.sunday.id} />
              <input type="hidden" name="slot" value={slot} />
              <label htmlFor={`slot-${slot}`} className={labelClass}>
                {slot} · {ROLE_LABELS[slot]}
              </label>
              <AutoSubmitSelect
                id={`slot-${slot}`}
                name="memberId"
                defaultValue={current ? String(current.memberId) : ""}
                className={cx(inputClass, !current && "text-muted")}
              >
                <option value="">Not set</option>
                {current && <option value={current.memberId}>{current.name}</option>}
                {plays.length > 0 && <CandidateGroups people={plays} ctx={ctx} />}
                {others.length > 0 && (
                  <optgroup label={`Doesn't usually play ${ROLE_LABELS[slot].toLowerCase()}`}>
                    {others.map((m) => (
                      <option key={m.id} value={m.id}>
                        {candidateLabel(m, ctx)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </AutoSubmitSelect>
            </form>
          );
        })}
      </div>
    </Card>
  );
}

function DetailsCard({ sunday }: { sunday: Sunday }) {
  return (
    <Card>
      <SectionTitle>Details</SectionTitle>
      <form action={updateSundayDetails} className="space-y-3">
        <input type="hidden" name="serviceId" value={sunday.id} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="language" className={labelClass}>
              Language
            </label>
            <select id="language" name="language" defaultValue={sunday.language} className={inputClass}>
              <option value="tl">Tagalog</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label htmlFor="palette" className={labelClass}>
              Wear
            </label>
            <input
              id="palette"
              name="palette"
              defaultValue={sunday.palette ?? ""}
              placeholder="e.g. Beige"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="occasion" className={labelClass}>
            Occasion <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="occasion"
            name="occasion"
            defaultValue={sunday.occasion ?? ""}
            placeholder="e.g. Christmas Sunday"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes for the team <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={sunday.notes ?? ""}
            placeholder="Call time, practice schedule, reminders"
            className={cx(inputClass, "py-2.5")}
          />
        </div>
        <SubmitButton variant="soft" className="w-full" pendingLabel="Saving…">
          Save details
        </SubmitButton>
      </form>
    </Card>
  );
}

function PublishCard({ sunday, review }: { sunday: Sunday; review: Review }) {
  const published = sunday.status === "published";
  return (
    <Card className={published ? "border-ok/40" : undefined}>
      <SectionTitle>{published ? "Published" : "Draft"}</SectionTitle>
      <p className="mb-3 text-[15px] text-muted">
        {published
          ? "The team sees this as final. Copy it to the group chat so everyone knows."
          : "The team can already see this draft, marked as still being planned."}
      </p>
      {!published && !review.canPublish && (
        <div className="mb-3">
          <Notice tone="danger">Fix the red items above to publish.</Notice>
        </div>
      )}
      <div className="space-y-2">
        <form action={setStatus}>
          <input type="hidden" name="date" value={sunday.date} />
          <input type="hidden" name="status" value={published ? "draft" : "published"} />
          <SubmitButton
            variant={published ? "secondary" : "primary"}
            className="w-full"
            disabled={!published && !review.canPublish}
            pendingLabel="Saving…"
          >
            {published ? "Move back to draft" : "Publish lineup"}
          </SubmitButton>
        </form>
        <CopyButton text={lineupText(sunday)} variant={published ? "primary" : "secondary"} className="w-full">
          Copy lineup for the group chat
        </CopyButton>
      </div>
    </Card>
  );
}
