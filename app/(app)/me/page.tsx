import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitButton } from "@/components/client";
import { Card, Chip, Notice, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/lineup";
import { signOut, turnOffLeaderTools } from "./actions";
import { LeaderForm } from "./leader-form";
import { NotificationSettings } from "@/components/notification-settings";
import { pushConfig } from "@/lib/notifications/config";
import { TEAM_TIME_ZONE } from "@/lib/dates";

export const metadata: Metadata = { title: "Me" };

export default function MePage(props: PageProps<"/me">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Me searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Me({ searchParams }: { searchParams: PageProps<"/me">["searchParams"] }) {
  const viewer = await requireViewer();
  const params = await searchParams;

  return (
    <>
      <PageHeader eyebrow="Your team space" title="Your profile"><p className="text-[15px] text-muted">Your gifts, your role, and how you serve.</p></PageHeader>
      <section className="profile-banner" aria-label="Your membership">
        <span className="profile-avatar" aria-hidden="true">{viewer.name.charAt(0)}</span>
        <div><h2>{viewer.name}</h2><p>{viewer.leader ? "Worship leader" : "Worship team member"} · Green Pasture Life Church</p></div>
      </section>
      <div className="screen-grid">
        <NotificationSettings publicKey={pushConfig()?.publicKey ?? null} timeZone={TEAM_TIME_ZONE} />
        <Card>
          <SectionTitle>What you do</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {viewer.sings && <Chip tone="joy">Sings</Chip>}
            {viewer.instruments.map((slot) => (
              <Chip key={slot}>{ROLE_LABELS[slot]}</Chip>
            ))}
            {!viewer.sings && !viewer.instruments.length && (
              <p className="text-[15px] text-muted">Nothing set yet.</p>
            )}
          </div>
          <p className="mt-3 text-[14px] text-muted">Something wrong? A leader can change it.</p>
        </Card>

        <Card>
          <SectionTitle>Leader tools</SectionTitle>
          {viewer.leader ? (
            <>
              <p className="mb-3 text-[15px] text-muted">
                On. You can build lineups, see who&apos;s free and manage the team.
              </p>
              <form action={turnOffLeaderTools}>
                <SubmitButton variant="secondary" className="w-full">
                  Turn off leader tools on this phone
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              {params.leader === "required" && (
                <div className="mb-3">
                  <Notice tone="warn">That page is for leaders. Enter the leader code first.</Notice>
                </div>
              )}
              <p className="mb-3 text-[15px] text-muted">
                For leaders and coordinators who build the lineups.
              </p>
              <LeaderForm />
            </>
          )}
        </Card>
      </div>
      <form action={signOut} className="profile-signout">
        <SubmitButton variant="danger" className="w-full">
          Sign out
        </SubmitButton>
      </form>
    </>
  );
}
