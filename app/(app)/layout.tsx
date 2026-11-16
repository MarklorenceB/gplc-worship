import { Suspense } from "react";
import { Nav, NavFallback } from "@/components/nav";
import { AppMain } from "@/components/app-main";
import { LiveUpdates } from "@/components/live-updates";
import { getDb } from "@/lib/db/client";
import { getLineupRevision } from "@/lib/db/revision";
import { getViewer } from "@/lib/auth";
import "./workspace.css";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-workspace">
      <a href="#main-content" className="app-skip-link">Skip to content</a>
      <Suspense fallback={<NavFallback />}><ViewerNav /></Suspense>
      <AppMain>
        <div className="app-content">{children}</div>
        <Suspense fallback={null}><LiveLineupUpdates /></Suspense>
        <footer className="app-footer">Green Pasture Life Church <span>·</span> Made for our team. For His glory.</footer>
      </AppMain>
    </div>
  );
}

async function ViewerNav() {
  const viewer = await getViewer();
  return <Nav leader={!!viewer?.leader} name={viewer?.name ?? ""} />;
}

async function LiveLineupUpdates() {
  if (!(await getViewer())) return null;
  return <LiveUpdates initialRevision={await getLineupRevision(await getDb())} />;
}
