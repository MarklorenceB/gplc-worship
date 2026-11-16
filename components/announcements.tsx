import Link from "next/link";
import type { ReactNode } from "react";
import type { Announcement } from "@/lib/announcements";
import { TEAM_TIME_ZONE } from "@/lib/dates";
import { buttonClass, Card, Chip } from "./ui";

export function AnnouncementCard({ announcement, compact = false, children }: {
  announcement: Announcement; compact?: boolean; children?: ReactNode;
}) {
  return <Card as="article" className="min-w-0">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
      <Chip tone={announcement.archivedAt ? "neutral" : "primary"}>{announcement.archivedAt ? "Archived" : "Team announcement"}</Chip>
      <span>From {announcement.authorName}</span>
      <time dateTime={announcement.createdAt.toISOString()}>{announcement.createdAt.toLocaleString("en-PH", {
        timeZone: TEAM_TIME_ZONE, dateStyle: "medium", timeStyle: "short",
      })}</time>
    </div>
    <h2 className="font-display text-[21px] font-bold leading-tight [overflow-wrap:anywhere]">
      <Link href={`/announcements/${announcement.id}`} className="hover:text-primary">{announcement.title}</Link>
    </h2>
    <p className={`mt-3 whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere] ${compact ? "line-clamp-3" : ""}`}>{announcement.body}</p>
    {compact && <Link href={`/announcements/${announcement.id}`} className="mt-3 inline-flex min-h-11 items-center text-[14px] font-bold text-primary">Read announcement →</Link>}
    {children}
  </Card>;
}

export function AnnouncementPagination({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  const separator = base.includes("?") ? "&" : "?";
  return <nav aria-label="Announcement pages" className="mt-5 flex items-center justify-between gap-3">
    {page > 1 ? <Link href={`${base}${separator}page=${page - 1}`} className={buttonClass("secondary")}>← Newer</Link> : <span />}
    {(page > 1 || hasMore) && <span className="text-[13px] text-muted">Page {page}</span>}
    {hasMore ? <Link href={`${base}${separator}page=${page + 1}`} className={buttonClass("secondary")}>Older →</Link> : <span />}
  </nav>;
}
