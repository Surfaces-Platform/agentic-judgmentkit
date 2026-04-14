import { CopyButton } from "@/components/product/copy-button";
import type { LandingPageContent } from "@/lib/types";

type LandingPageProps = {
  content: LandingPageContent;
};

export function LandingPage({ content }: LandingPageProps) {
  const prompts = [
    {
      title: "Run the installer",
      copyLabel: "Copy install command",
      value: content.install_command,
    },
    {
      title: "Verify locally",
      copyLabel: "Copy verify prompt",
      value: content.verify_prompt,
    },
  ];

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
            {prompts.map((prompt) => (
              <section key={prompt.title} className="space-y-4">
                <p className="theme-text-primary text-lg font-semibold tracking-[-0.03em]">
                  {prompt.title}
                </p>
                <div className="relative">
                  <CopyButton
                    value={prompt.value}
                    label={prompt.copyLabel}
                    className="landing-flat-control absolute right-3 top-3 z-10"
                  />
                  <pre className="theme-code-block landing-flat-code overflow-x-auto whitespace-pre-wrap break-words px-4 py-5 pr-16 text-xs leading-6 sm:px-5 sm:text-sm">
                    <code>{prompt.value}</code>
                  </pre>
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
