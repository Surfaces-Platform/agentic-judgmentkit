import Link from "next/link";

import { CopyButton } from "@/components/product/copy-button";
import type { LandingPageContent } from "@/lib/types";

type LandingPageProps = {
  content: LandingPageContent;
};

export function LandingPage({ content }: LandingPageProps) {
  const prompts = [
    {
      title: "Install JudgmentKit",
      copyLabel: "Copy install prompt",
      value: content.install_prompt,
    },
    {
      title: "Verify JudgmentKit",
      copyLabel: "Copy verify prompt",
      value: content.verify_prompt,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[84rem] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <section className="section-fade pt-6 sm:pt-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,40rem)] lg:gap-12">
          <div className="max-w-[42rem]">
            <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
              {content.eyebrow}
            </p>
            <h1 className="theme-text-primary mt-4 max-w-[34rem] text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
              {content.headline}
            </h1>
            <p className="theme-text-secondary mt-5 max-w-[38rem] text-base leading-7 sm:text-lg">
              {content.subhead}
            </p>
          </div>

          <div id="prompts" className="space-y-5 lg:pt-1">
            {prompts.map((prompt) => (
              <section key={prompt.title}>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="theme-text-primary text-lg font-semibold tracking-[-0.03em]">
                    {prompt.title}
                  </p>
                  <CopyButton
                    value={prompt.value}
                    label={prompt.copyLabel}
                    className="landing-flat-control shrink-0 self-start"
                  />
                </div>
                <pre className="theme-code-block landing-flat-code overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 text-xs leading-6 sm:text-sm">
                  <code>{prompt.value}</code>
                </pre>
              </section>
            ))}

            <Link
              href={content.inspect.href}
              className="theme-link-subtle inline-flex items-center text-sm font-semibold"
            >
              {content.inspect.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
