import Link from "next/link";
import { LANGUAGE_LABELS } from "@/lib/dates";
import type { Sunday } from "@/lib/data";
import { groupChatText, MY_ROLE_LABELS, type Role } from "@/lib/lineup";
import { Chip, DateBlock, roleTone } from "./ui";

export function lineupText(sunday: Sunday) {
  return groupChatText({
    date: sunday.date,
    language: sunday.language,
    theme: sunday.month.theme,
    palette: sunday.palette,
    occasion: sunday.occasion,
    songs: sunday.songs,
    people: sunday.people,
  });
}

export function rolesOf(sunday: Sunday, memberId: number): Role[] {
  return sunday.people.filter((p) => p.memberId === memberId).map((p) => p.role);
}

export function namesFor(sunday: Sunday, role: Role) {
  return sunday.people.filter((p) => p.role === role).map((p) => p.name);
}

export function StatusChip({ sunday }: { sunday: Sunday }) {
  return sunday.status === "published" ? (
    <Chip tone="ok">Final</Chip>
  ) : (
    <Chip tone="warn">Planning</Chip>
  );
}

export function MyRoleChips({ roles }: { roles: Role[] }) {
  return (
    <>
      {roles.map((role) => (
        <Chip key={role} tone={roleTone(role)}>
          {MY_ROLE_LABELS[role]}
        </Chip>
      ))}
    </>
  );
}

export function SundayCard({ sunday, viewerId }: { sunday: Sunday; viewerId: number }) {
  const mine = rolesOf(sunday, viewerId);
  const joyful = namesFor(sunday, "joyful");
  const solemn = namesFor(sunday, "solemn");
  const songs = sunday.songs.filter((s) => !s.isBackup).length;

  return (
    <li>
      <Link
        href={`/sunday/${sunday.date}`}
        className="sunday-card flex gap-3 rounded-3xl border border-line bg-card p-4 hover:border-primary/40"
      >
        <DateBlock date={sunday.date} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-[17px] font-bold">
              {LANGUAGE_LABELS[sunday.language]}
            </span>
            <StatusChip sunday={sunday} />
            {sunday.occasion && <Chip tone="primary">{sunday.occasion}</Chip>}
          </div>
          <dl className="mt-1.5 space-y-0.5 text-[14px] text-muted">
            {joyful.length > 0 && (
              <div>
                <dt className="inline font-semibold text-joy">Joyful </dt>
                <dd className="inline">{joyful.join(", ")}</dd>
              </div>
            )}
            {solemn.length > 0 && (
              <div>
                <dt className="inline font-semibold text-sol">Solemn </dt>
                <dd className="inline">{solemn.join(", ")}</dd>
              </div>
            )}
            <div>
              <dt className="sr-only">Details</dt>
              <dd>
                {songs ? `${songs} song${songs === 1 ? "" : "s"}` : "Songs not picked yet"}
                {sunday.palette && ` · Wear ${sunday.palette.toLowerCase()}`}
              </dd>
            </div>
          </dl>
          {mine.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone="you">You</Chip>
              <MyRoleChips roles={mine} />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
