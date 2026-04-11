"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isInspect =
    pathname === "/inspect" ||
    pathname.startsWith("/docs/") ||
    pathname.startsWith("/resources/") ||
    pathname.startsWith("/schemas/") ||
    pathname.startsWith("/mcp");

  return (
    <header className="theme-divider sticky top-0 z-40 border-b bg-[var(--theme-canvas)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="theme-mark flex h-10 w-10 items-center justify-center text-sm font-semibold tracking-[0.24em]">
              JK
            </span>
            <p className="theme-text-muted hidden text-[11px] font-semibold uppercase tracking-[0.28em] min-[360px]:block">
              JudgmentKit
            </p>
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1.5 text-[12px] font-medium sm:text-[13px]"
        >
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={isHome ? "theme-nav-pill theme-nav-pill-active" : "theme-nav-pill"}
          >
            Home
          </Link>
          <Link
            href="/inspect"
            aria-current={isInspect ? "page" : undefined}
            className={isInspect ? "theme-nav-pill theme-nav-pill-active" : "theme-nav-pill"}
          >
            Inspect
          </Link>
        </nav>
      </div>
    </header>
  );
}
