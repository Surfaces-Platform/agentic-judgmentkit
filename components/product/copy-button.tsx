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
      title={copied ? "Copied" : "Copy"}
      aria-label={copied ? `${label} copied` : label}
      className={[
        "theme-button-outline transform-gpu inline-flex h-9 w-9 items-center justify-center p-0 transition duration-200",
        copied
          ? "theme-copy-active"
          : "theme-link-subtle hover:border-[color:var(--theme-border-strong)] hover:text-[color:var(--theme-text-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="sr-only">{copied ? `${label} copied` : label}</span>
      {copied ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 4.2 4.2L19 6.5" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
