"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label: string;
  className?: string;
};

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={[
        "theme-button-outline transform-gpu px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition duration-200",
        copied
          ? "theme-copy-active"
          : "theme-link-subtle hover:border-[color:var(--theme-border-strong)] hover:text-[color:var(--theme-text-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
