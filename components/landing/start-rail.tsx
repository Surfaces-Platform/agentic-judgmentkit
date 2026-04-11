"use client";

import { startTransition } from "react";

import { CopyButton } from "@/components/product/copy-button";
import type { LandingPageContent, ProductSurfaceInstallTarget } from "@/lib/types";

type StartRailProps = {
  content: LandingPageContent;
  activeInstall: ProductSurfaceInstallTarget;
  activeInstallId: string;
  onSelectInstall: (id: string) => void;
};

export function StartRail({
  content,
  activeInstall,
  activeInstallId,
  onSelectInstall,
}: StartRailProps) {
  return (
    <section
      id="connect"
      className="landing-flat-panel min-w-0 overflow-hidden"
    >
      <div className="theme-divider border-b px-4 py-4 sm:px-5 sm:py-5">
        <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.24em]">
          {content.install_label}
        </p>
        {content.install_support ? (
          <p className="theme-text-secondary mt-2.5 max-w-xl text-sm leading-6">
            {content.install_support}
          </p>
        ) : null}

        <div className="theme-divider mt-4 grid grid-cols-3 overflow-hidden rounded-[var(--landing-radius)] border">
          {content.install_targets.map((target) => {
            const isActive = target.id === activeInstallId;
            return (
              <button
                key={target.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => startTransition(() => onSelectInstall(target.id))}
                className={
                  isActive
                    ? "border-r border-[color:var(--theme-action-fill)] bg-[var(--theme-action-fill)] px-3 py-2.5 text-sm font-semibold text-[color:var(--theme-inverse-text)] last:border-r-0"
                    : "theme-text-secondary border-r theme-divider bg-[var(--theme-panel)] px-3 py-2.5 text-sm font-semibold transition duration-200 hover:bg-[var(--theme-panel-muted)] hover:text-[color:var(--theme-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--theme-border-strong)] last:border-r-0"
                }
              >
                {target.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={activeInstall.id} className="section-fade min-w-0 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
              {activeInstall.connection_label}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <p className="theme-text-primary text-sm font-semibold">{activeInstall.config_path}</p>
              <span className="theme-chip landing-flat-control px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                {activeInstall.transport}
              </span>
            </div>
          </div>
          <CopyButton
            value={activeInstall.config_snippet}
            label="Copy config"
            className="landing-flat-control"
          />
        </div>

        <pre className="theme-code-block landing-flat-code mt-4 min-w-0 overflow-x-auto px-4 py-4 text-xs leading-6 sm:text-sm">
          <code>{activeInstall.config_snippet}</code>
        </pre>

      </div>
    </section>
  );
}
