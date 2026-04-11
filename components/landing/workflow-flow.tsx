import type { LandingPageWorkflowStep } from "@/lib/types";

type WorkflowFlowProps = {
  heading: string;
  support: string;
  steps: LandingPageWorkflowStep[];
};

export function WorkflowFlow({ heading, support, steps }: WorkflowFlowProps) {
  const visibleSteps = steps.slice(0, 3);

  return (
    <section
      id="workflow"
      className="theme-divider section-fade border-b py-10 sm:py-12"
    >
      <div className="flex flex-col gap-6">
        <div className="max-w-[40rem]">
          <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.3em]">
            How it works
          </p>
          <h2 className="theme-text-primary mt-4 text-[2rem] font-semibold tracking-[-0.04em] sm:text-[2.35rem]">
            {heading}
          </h2>
          {support ? (
            <p className="theme-text-secondary mt-3 text-base leading-7">{support}</p>
          ) : null}
        </div>

        <ol className="grid gap-3 md:grid-cols-3">
          {visibleSteps.map((step, index) => (
            <li
              key={step.id}
              className="landing-flat-panel px-4 py-4"
            >
              <span className="theme-control-surface landing-flat-control inline-flex items-center px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] theme-text-secondary">
                Step {index + 1}
              </span>
              <h3 className="theme-text-primary mt-3 text-lg font-semibold tracking-[-0.03em]">
                {step.title}
              </h3>
              <p className="theme-text-secondary mt-2 text-sm leading-6">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
