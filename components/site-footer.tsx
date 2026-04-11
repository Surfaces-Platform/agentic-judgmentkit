"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="theme-divider mt-16 border-t px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <div className="theme-text-secondary mx-auto max-w-7xl text-sm">
        <p>
          &copy; 2026{" "}
          <a
            className="theme-link-subtle font-medium underline underline-offset-4"
            href="https://surfaces.systems"
          >
            surfaces.systems
          </a>
        </p>
      </div>
    </footer>
  );
}
