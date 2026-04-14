"use client";

import { useState } from "react";

import { CopyButton } from "@/components/product/copy-button";
import type { LandingPageContent } from "@/lib/types";

type LandingPageProps = {
  content: LandingPageContent;
};

export function LandingPage({ content }: LandingPageProps) {
  const [selectedInstallOptionId, setSelectedInstallOptionId] = useState(
    content.install_options[0]?.id ?? "",
  );
  const selectedInstallOption =
    content.install_options.find((option) => option.id === selectedInstallOptionId) ??
    content.install_options[0];

  return (
    <div className="mx-auto w-full max-w-[84rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="section-fade pt-6 sm:pt-8">
        <div className="mx-auto flex w-full max-w-[42rem] flex-col items-center text-center">
          <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
            {content.eyebrow}
          </p>
          <h1 className="theme-text-primary mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
            {content.headline}
          </h1>
          <p className="theme-text-secondary mt-6 max-w-[34rem] text-base leading-7 sm:text-lg">
            {content.subhead}
          </p>

          <div id="prompts" className="mt-12 w-full space-y-8 text-left sm:mt-14 sm:space-y-10">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="theme-text-primary text-lg font-semibold tracking-[-0.03em]">
                  Run the installer
                </p>
                <nav
                  aria-label="Install clients"
                  className="flex flex-wrap gap-1.5 sm:justify-end"
                >
                  {content.install_options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selectedInstallOption?.id === option.id}
                      onClick={() => setSelectedInstallOptionId(option.id)}
                      className={
                        selectedInstallOption?.id === option.id
                          ? "theme-nav-pill theme-nav-pill-active"
                          : "theme-nav-pill"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="relative">
                <CopyButton
                  value={selectedInstallOption?.command ?? content.install_command}
                  label={`Copy ${selectedInstallOption?.label ?? "selected"} install command`}
                  className="landing-flat-control absolute right-3 top-3 z-10"
                />
                <pre className="theme-code-block landing-flat-code overflow-x-auto whitespace-pre-wrap break-words px-4 py-5 pr-16 text-xs leading-6 sm:px-5 sm:text-sm">
                  <code>{selectedInstallOption?.command ?? content.install_command}</code>
                </pre>
              </div>
            </section>

            <section className="space-y-4">
              <p className="theme-text-primary text-lg font-semibold tracking-[-0.03em]">
                Verify locally
              </p>
              <div className="relative">
                <CopyButton
                  value={content.verify_prompt}
                  label="Copy verify prompt"
                  className="landing-flat-control absolute right-3 top-3 z-10"
                />
                <pre className="theme-code-block landing-flat-code overflow-x-auto whitespace-pre-wrap break-words px-4 py-5 pr-16 text-xs leading-6 sm:px-5 sm:text-sm">
                  <code>{content.verify_prompt}</code>
                </pre>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
