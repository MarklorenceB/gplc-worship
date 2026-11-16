"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, CheckCircleIcon, ClipboardIcon, HomeIcon, MegaphoneIcon, UserIcon } from "./icons";
import { cx } from "./ui";

const memberTabs = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/schedule", label: "Schedule", Icon: CalendarIcon },
  { href: "/availability", label: "Availability", Icon: CheckCircleIcon },
  { href: "/announcements", label: "Updates", Icon: MegaphoneIcon },
];
const leaderTab = { href: "/lead", label: "Lead", Icon: ClipboardIcon };
const meTab = { href: "/me", label: "Me", Icon: UserIcon };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/schedule") return pathname.startsWith("/schedule") || pathname.startsWith("/sunday");
  return pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/" className="app-brand" aria-label="GPLC Worship Team home">
      <Image src="/gplc-logo.jpg" alt="" width={1500} height={1000} sizes="72px" className="app-brand-logo" />
      <span><strong>GPLC Worship</strong><small>GREEN PASTURE LIFE CHURCH</small></span>
    </Link>
  );
}

export function Nav({ leader, name }: { leader: boolean; name: string }) {
  return <NavBar leader={leader} name={name} pathname={usePathname()} />;
}

export function NavFallback() {
  return <NavBar leader={false} name="" pathname="" />;
}

function NavBar({ leader, name, pathname }: { leader: boolean; name: string; pathname: string }) {
  const tabs = [...memberTabs, ...(leader ? [leaderTab] : []), meTab];
  return (
    <>
      <header className="app-topbar">
        <Brand />
        <Link href="/me" className="app-avatar" aria-label={name ? `${name}, your profile` : "Your profile"}>
          {name ? name.charAt(0) : <UserIcon size={18} />}
        </Link>
      </header>
      <aside className="app-sidebar">
        <div className="app-sidebar-brand"><Brand /></div>
        <p className="app-nav-label">YOUR TEAM SPACE</p>
        <nav aria-label="Main">
          <ul className="app-nav-list">
            {tabs.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link href={href} aria-current={active ? "page" : undefined} className={cx("app-nav-link", active && "is-active")}>
                    <span className="app-nav-icon"><Icon size={21} /></span>
                    <span>{label}</span>
                    <span className="app-nav-dot" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="app-sidebar-bottom">
          <div className="app-sidebar-message"><MusicMark /><p>Many gifts.<br /><span>One purpose.</span></p><small>Let&apos;s serve together.</small></div>
          <Link href="/me" className="app-account">
            <span className="app-avatar">{name ? name.charAt(0) : <UserIcon size={18} />}</span>
            <span><strong>{name || "Your profile"}</strong><small>{leader ? "Worship leader" : "Worship team member"}</small></span>
          </Link>
        </div>
      </aside>
    </>
  );
}

function MusicMark() {
  return <span className="app-sidebar-flourish" aria-hidden="true">✳</span>;
}
