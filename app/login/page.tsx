import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, MusicIcon, UserIcon } from "@/components/icons";
import { getViewer } from "@/lib/auth";
import { listMembers } from "@/lib/data";
import { hasTeamPass } from "@/lib/session";
import { chooseMember, changeTeamCode } from "./actions";
import { TeamCodeForm } from "./team-code-form";
import "./login.css";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <aside className="login-welcome" aria-label="GPLC Worship Team">
          <div className="login-brand">
            <Image
              src="/gplc-logo.jpg"
              alt="Green Pasture Life Church logo"
              width={1500}
              height={1000}
              sizes="108px"
              loading="eager"
              className="login-logo"
            />
            <div>
              <p className="login-church">Green Pasture <br />Life Church</p>
              <p className="login-brandCaption">PRAISE &amp; WORSHIP</p>
            </div>
          </div>
          <div className="login-welcomeCopy">
            <p className="login-eyebrow">ROOTED IN FAITH. UNITED IN WORSHIP.</p>
            <p className="login-headline">Many gifts.<br /><span>One purpose.</span></p>
            <p className="login-intro">A place to prepare, stay connected,<br className="login-desktopBreak" /> and serve together.</p>
          </div>
          <div className="login-features">
            <span><CalendarIcon size={18} /> Your Sundays</span>
            <span><MusicIcon size={18} /> Your songs</span>
            <span><UserIcon size={18} /> Your team</span>
          </div>
          <div className="login-arcs" aria-hidden="true"><i /><i /><i /></div>
        </aside>
        <div className="login-formSide">
          <section className="login-card" aria-label="Team sign in">
            <Suspense fallback={<LoginSkeleton />}>
              <LoginStep />
            </Suspense>
          </section>
          <p className="login-footer">Made for our team. For His glory.</p>
        </div>
      </div>
    </main>
  );
}

function Steps({ member = false }: { member?: boolean }) {
  return (
    <ol className="login-steps" aria-label="Sign-in progress">
      <li className={member ? "login-completedStep" : "login-currentStep"} aria-current={member ? undefined : "step"}>
        <span>{member ? <CheckIcon size={13} /> : "01"}</span> Team code
      </li>
      <li className="login-stepConnector" aria-hidden="true" />
      <li className={member ? "login-currentStep" : undefined} aria-current={member ? "step" : undefined}>
        <span>02</span> Your name
      </li>
    </ol>
  );
}

function LoginSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading sign in" className="login-skeleton">
      <div /><div /><div />
    </div>
  );
}

async function LoginStep() {
  if (await getViewer()) redirect("/");

  if (!(await hasTeamPass())) {
    return (
      <>
        <Steps />
        <div className="login-formHeading">
          <p className="login-kicker">GPLC WORSHIP TEAM</p>
          <h1>Welcome back.</h1>
          <p>Let&apos;s get ready for Sunday.<br />Enter your team code to get started.</p>
        </div>
        <TeamCodeForm />
        <div className="login-help">
          <span className="login-helpIcon" aria-hidden="true">?</span>
          <p><strong>First time here?</strong><br />Ask your worship leader for the team code.</p>
        </div>
      </>
    );
  }

  const people = (await listMembers()).filter((m) => m.active);
  return (
    <>
      <Steps member />
      <div className="login-formHeading">
        <p className="login-kicker">YOU&apos;RE PART OF THE TEAM</p>
        <h1>Find your name.</h1>
        <p>Select your name to see your Sundays<br className="login-desktopBreak" /> and let the team know when you&apos;re free.</p>
      </div>
      <form action={chooseMember} className="login-members">
        {people.map((m) => (
          <button key={m.id} name="memberId" value={m.id} className="login-member">
            <span className="login-initial" aria-hidden="true">{m.name.charAt(0)}</span>
            <span>{m.name}</span>
            <ChevronRightIcon size={16} />
          </button>
        ))}
      </form>
      <p className="login-memberHint">Name missing? Ask a leader to add you.</p>
      <form action={changeTeamCode}>
        <button className="login-backButton"><ChevronLeftIcon size={16} /> Use a different team code</button>
      </form>
    </>
  );
}
