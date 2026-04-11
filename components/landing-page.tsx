"use client";

import { useState } from "react";

import Link from "next/link";

import { StartRail } from "@/components/landing/start-rail";
import { WorkflowFlow } from "@/components/landing/workflow-flow";
import type { LandingPageContent } from "@/lib/types";

type LandingPageProps = {
  content: LandingPageContent;
};

export function LandingPage({ content }: LandingPageProps) {
  const [activeInstallId, setActiveInstallId] = useState(
    content.install_targets[0]?.id ?? "codex",
  );
  const activeInstall =
    content.install_targets.find((target) => target.id === activeInstallId) ??
    content.install_targets[0];

  if (!activeInstall) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[84rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="theme-divider section-fade border-b pb-10 pt-6 sm:pb-12 sm:pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-5">
            <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
              {content.eyebrow}
            </p>
            <h1 className="theme-text-primary mt-4 max-w-[26rem] text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
              {content.headline}
            </h1>
            <p className="theme-text-secondary mt-5 max-w-[28rem] text-base leading-7 sm:text-lg">
              {content.subhead}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#connect"
                className="theme-button-solid landing-flat-control inline-flex items-center justify-center px-5 py-3 text-sm font-semibold transition"
              >
                {content.primary_cta_label}
              </Link>
              <Link
                href="#workflow"
                className="theme-button-outline landing-flat-control inline-flex items-center justify-center px-5 py-3 text-sm font-semibold transition"
              >
                {content.secondary_cta_label}
              </Link>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <StartRail
              content={content}
              activeInstall={activeInstall}
              activeInstallId={activeInstallId}
              onSelectInstall={setActiveInstallId}
            />
          </div>
        </div>
      </section>

      <WorkflowFlow
        heading={content.workflow_heading}
        support={content.workflow_support}
        steps={content.workflow_steps}
      />

      <section id="proof" className="theme-divider section-fade border-b py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr] lg:gap-8">
          <div className="max-w-[30rem]">
            <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
              Trust
            </p>
            <h2 className="theme-text-primary mt-4 text-[2rem] font-semibold tracking-[-0.04em] sm:text-[2.35rem]">
              {content.proof_heading}
            </h2>
            <p className="theme-text-secondary mt-3 text-base leading-7">{content.proof_support}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {content.proof_inputs.map((input) => (
              <article
                key={input.id}
                className="landing-flat-panel px-4 py-4"
              >
                <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Published {input.type}
                </p>
                <h3 className="theme-text-primary mt-3 text-lg font-semibold tracking-[-0.03em]">
                  {input.title}
                </h3>
                <p className="theme-text-secondary mt-2 text-sm leading-6">{input.summary}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="theme-divider mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row">
          <Link
            href="#connect"
            className="theme-button-solid landing-flat-control inline-flex items-center justify-center px-5 py-3 text-sm font-semibold transition"
          >
            {content.final_primary_cta_label}
          </Link>
          <Link
            href={content.inspect.href}
            className="theme-button-outline landing-flat-control inline-flex items-center justify-center px-5 py-3 text-sm font-semibold transition"
          >
            {content.final_secondary_cta_label}
          </Link>
        </div>
        {content.final_support ? (
          <div className="mt-4 max-w-[34rem]">
            <p className="theme-text-secondary text-sm leading-6">{content.final_support}</p>
          </div>
        ) : null}
      </section>

      <section className="section-fade py-5">
        <div className="theme-divider border-t pt-5">
          <p className="theme-text-secondary text-sm leading-6">
            {content.final_heading}
          </p>
        </div>
      </section>
    </div>
  );
}
