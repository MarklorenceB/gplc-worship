import { Suspense } from "react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnnouncementCard } from "@/components/announcements";
import { buttonClass, Notice, PageHeader, PageSkeleton } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { validAnnouncementId } from "@/lib/announcements";
import { getDb } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";

export const metadata = { title: "Team announcement" };
export default function AnnouncementPage({ params }: PageProps<"/announcements/[id]">) {
  return <Suspense fallback={<PageSkeleton />}><Announcement params={params} /></Suspense>;
}

async function Announcement({ params }: Pick<PageProps<"/announcements/[id]">, "params">) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!validAnnouncementId(id)) notFound();
  const [post] = await (await getDb()).select().from(announcements).where(eq(announcements.id, id));
  if (!post) notFound();
  return <>
    <PageHeader eyebrow="From our leaders" title="Team announcement" back={{ href: "/announcements", label: "All announcements" }} />
    {post.archivedAt && !viewer.leader ? <Notice>This announcement has been archived by a leader. Check the latest announcements for current details.</Notice>
      : <AnnouncementCard announcement={post} />}
    {viewer.leader && <Link href="/lead/announcements" className={buttonClass("soft", "mt-5")}>Manage announcements</Link>}
  </>;
}
