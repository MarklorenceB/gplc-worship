import Link from "next/link";
import type { ReactNode } from "react";
import { dateBlock } from "@/lib/dates";
import type { Role } from "@/lib/lineup";
import { ChevronLeftIcon } from "./icons";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export type Tone =
  | "neutral"
  | "primary"
  | "joy"
  | "sol"
  | "back"
  | "you"
  | "warn"
  | "danger"
  | "ok";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-back-soft text-back",
  primary: "bg-primary-soft text-primary",
  joy: "bg-joy-soft text-joy",
  sol: "bg-sol-soft text-sol",
  back: "bg-back-soft text-back",
  you: "bg-you text-ink",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  ok: "bg-ok-soft text-ok",
};

export function roleTone(role: Role): Tone {
  if (role === "joyful") return "joy";
  if (role === "solemn") return "sol";
  if (role === "devotion" || role === "soaking") return "ok";
  return "back";
}

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold leading-tight",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "li" | "article";
}) {
  return (
    <Tag className={cx("app-card rounded-3xl border border-line bg-card p-4", className)}>{children}</Tag>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="app-section-heading mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[19px] font-bold tracking-tight">{children}</h2>
      {aside}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  back,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <header className="app-page-header mb-5">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] font-semibold text-primary"
        >
          <ChevronLeftIcon size={20} />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="app-eyebrow text-[14px] font-semibold text-muted">{eyebrow}</p>}
      <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">
        {title}
      </h1>
      {children}
    </header>
  );
}

const buttonBase =
  "app-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  secondary: "border border-line bg-card text-ink hover:bg-ground",
  soft: "bg-primary-soft text-primary hover:bg-[#dce8d2]",
  danger: "bg-danger-soft text-danger hover:bg-[#fcdcda]",
  ghost: "text-primary hover:bg-primary-soft",
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cx(buttonBase, buttonVariants[variant], className);
}

export function DateBlock({ date, tone = "light" }: { date: string; tone?: "light" | "dark" }) {
  const { month, day } = dateBlock(date);
  return (
    <div
      className={cx(
        "app-date flex h-14 w-14 flex-none flex-col items-center justify-center rounded-2xl",
        tone === "dark" ? "bg-white/15 text-white" : "bg-ground text-ink",
      )}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{month}</span>
      <span className="font-display text-[22px] font-extrabold leading-none">{day}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="app-empty rounded-3xl border border-dashed border-line bg-card/60 px-5 py-8 text-center">
      <p className="font-display text-[18px] font-bold">{title}</p>
      {children && <div className="mt-1 text-[15px] text-muted">{children}</div>}
    </div>
  );
}

export function Notice({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  return (
    <p className={cx("rounded-2xl px-4 py-3 text-[15px] font-semibold", toneClasses[tone])}>
      {children}
    </p>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded-full bg-line" />
      <div className="h-8 w-56 rounded-full bg-line" />
      <div className="h-40 rounded-3xl bg-card" />
      <div className="h-28 rounded-3xl bg-card" />
      <div className="h-28 rounded-3xl bg-card" />
    </div>
  );
}

export const inputClass =
  "app-input min-h-11 w-full rounded-2xl border border-line bg-card px-3.5 text-[16px] text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export const labelClass = "mb-1.5 block text-[14px] font-bold text-ink";
