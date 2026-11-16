"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckIcon, CopyIcon } from "./icons";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: string;
  variant?: Parameters<typeof buttonClass>[0];
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={buttonClass(variant, className)}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** A select that saves as soon as a choice is made. */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  const { pending } = useFormStatus();
  return (
    <select
      {...props}
      disabled={pending || props.disabled}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older mobile browsers: fall back to a hidden textarea.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyButton({
  text,
  children,
  copiedLabel = "Copied. Paste it in the group chat.",
  variant = "secondary",
  className,
}: {
  text: string;
  children: ReactNode;
  copiedLabel?: string;
  variant?: Parameters<typeof buttonClass>[0];
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={buttonClass(variant, className)}
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? "copied" : "failed");
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 4000);
      }}
    >
      {state === "copied" ? <CheckIcon size={20} /> : <CopyIcon size={20} />}
      <span aria-live="polite">
        {state === "copied" ? copiedLabel : state === "failed" ? "Couldn't copy. Try again." : children}
      </span>
    </button>
  );
}
