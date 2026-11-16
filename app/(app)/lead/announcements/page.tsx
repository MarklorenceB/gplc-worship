import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Suspense } from "react";
import { AnnouncementCard, AnnouncementPagination } from "@/components/announcements";
import { SubmitButton } from "@/components/client";
import { buttonClass, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { announcementPage, ANNOUNCEMENT_TITLE_LIMIT, ANNOUNCEMENT_BODY_LIMIT, ANNOUNCEMENTS_PER_PAGE, listAnnouncements } from "@/lib/announcements";
import { getDb } from "@/lib/db/client";
import { archiveTeamAnnouncement } from "./actions";
import { AnnouncementForm } from "./announcement-form";

export const metadata = { title: "Leader announcements" };
export const maxDuration = 60;
export default function LeaderAnnouncementsPage({ searchParams }: PageProps<"/lead/announcements">) {
  return <Suspense fallback={<PageSkeleton />}><LeaderAnnouncements searchParams={searchParams} /></Suspense>;
}

async function LeaderAnnouncements({ searchParams }: Pick<PageProps<"/lead/announcements">, "searchParams">) {
  await requireLeader();
  const params = await searchParams;
  const archived = params.archived === "1";
  const page = announcementPage(params.page);
  const posts = await listAnnouncements(await getDb(), { archived, limit: ANNOUNCEMENTS_PER_PAGE + 1, offset: (page - 1) * ANNOUNCEMENTS_PER_PAGE });
  return <>
    <PageHeader eyebrow="Leader tools" title="Team announcements" back={{ href: "/lead", label: "Lineups" }}>
      <p className="mt-2 text-[15px] text-muted">One message. The whole team in the loop.</p>
    </PageHeader>
    {!archived && <AnnouncementForm id={randomUUID()} titleLimit={ANNOUNCEMENT_TITLE_LIMIT} bodyLimit={ANNOUNCEMENT_BODY_LIMIT} />}
    <nav aria-label="Announcement status" className="mb-5 flex flex-wrap gap-2">
      <Link href="/lead/announcements" aria-current={!archived ? "page" : undefined} className={buttonClass(archived ? "secondary" : "soft")}>Published</Link>
      <Link href="/lead/announcements?archived=1" aria-current={archived ? "page" : undefined} className={buttonClass(archived ? "soft" : "secondary")}>Archived</Link>
      <Link href="/announcements" className={buttonClass("ghost")}>View team feed →</Link>
    </nav>
    <div className="space-y-4">{posts.slice(0, ANNOUNCEMENTS_PER_PAGE).map(post => <AnnouncementCard key={post.id} announcement={post}>
      <form action={archiveTeamAnnouncement} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="archived" value={archived ? "0" : "1"} />
        <SubmitButton variant="secondary" pendingLabel="Saving…">{archived ? "Restore to feed" : "Archive announcement"}</SubmitButton>
        {archived && <p className="mt-2 text-[12px] text-muted">Restoring shows it in the feed again without sending another alert.</p>}
      </form>
    </AnnouncementCard>)}</div>
    {!posts.length && <EmptyState title={archived ? "No archived announcements" : "Ready when you are"}>{archived ? "Archived messages are kept here for leaders." : "Publish your first message using the form above."}</EmptyState>}
    <AnnouncementPagination page={page} hasMore={posts.length > ANNOUNCEMENTS_PER_PAGE} base={`/lead/announcements${archived ? "?archived=1" : ""}`} />
  </>;
}
