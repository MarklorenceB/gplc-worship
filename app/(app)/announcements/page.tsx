import Link from "next/link";
import { Suspense } from "react";
import { AnnouncementCard, AnnouncementPagination } from "@/components/announcements";
import { buttonClass, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { announcementPage, ANNOUNCEMENTS_PER_PAGE, listAnnouncements } from "@/lib/announcements";
import { getDb } from "@/lib/db/client";

export const metadata = { title: "Announcements" };
export default function AnnouncementsPage({ searchParams }: PageProps<"/announcements">) {
  return <Suspense fallback={<PageSkeleton />}><Feed searchParams={searchParams} /></Suspense>;
}

async function Feed({ searchParams }: Pick<PageProps<"/announcements">, "searchParams">) {
  const viewer = await requireViewer();
  const page = announcementPage((await searchParams).page);
  const posts = await listAnnouncements(await getDb(), { limit: ANNOUNCEMENTS_PER_PAGE + 1, offset: (page - 1) * ANNOUNCEMENTS_PER_PAGE });
  return <>
    <PageHeader eyebrow="Stay connected" title="Team announcements">
      <p className="mt-2 text-[15px] text-muted">Practice plans, reminders, and a word from our leaders.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {viewer.leader && <Link href="/lead/announcements" className={buttonClass()}>Write an announcement</Link>}
        <Link href="/me#phone-notifications" className={buttonClass("soft")}>Set up phone alerts</Link>
      </div>
    </PageHeader>
    <div className="space-y-4">{posts.slice(0, ANNOUNCEMENTS_PER_PAGE).map(post => <AnnouncementCard key={post.id} announcement={post} />)}</div>
    {!posts.length && <EmptyState title={page > 1 ? "No more announcements" : "All quiet for now"}>New messages from your leaders will appear here and on Home.</EmptyState>}
    <AnnouncementPagination page={page} hasMore={posts.length > ANNOUNCEMENTS_PER_PAGE} base="/announcements" />
  </>;
}
