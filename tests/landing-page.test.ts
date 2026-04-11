import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "@/components/landing-page";
import { loadLandingPage } from "@/lib/landing-page";

describe("landing page", () => {
  it("loads the greenfield homepage copy and dogfood inputs", async () => {
    const content = await loadLandingPage("https://judgmentkit.ai/mcp");

    expect(content.headline).toBe("Put your standards in the path of AI work.");
    expect(content.primary_cta_label).toBe("Connect JudgmentKit");
    expect(content.secondary_cta_label).toBe("How it works");
    expect(content.subhead).toBe(
      "Every review starts from your published standards. Not improvisation.",
    );
    expect(content.workflow_heading).toBe("From first draft to next pass.");
    expect(content.workflow_support).toBe("");
    expect(content.workflow_steps.slice(0, 3).map((step) => step.title)).toEqual([
      "Add it to your client",
      "Review the draft",
      "Generate the next pass",
    ]);
    expect(content.workflow_steps[0].artifacts[0]).toMatchObject({
      label: "Feature intent",
      value:
        "Refine the JudgmentKit.com landing page for copy distinctness and human-first onboarding",
    });
    expect(content.workflow_steps[1].artifacts[0].href).toBe(
      "/inspect#resource-workflow.ai-ui-generation",
    );
    expect(content.workflow_steps[2].artifacts.map((artifact) => artifact.label)).toEqual([
      "Guardrail artifact",
      "Calibration example",
    ]);
    expect(content.proof_inputs.map((input) => input.id)).toEqual([
      "workflow.ai-ui-generation",
      "guardrail.ui-copy-clarity",
      "example.ui-generation.repetitive-copy-drift",
    ]);
    expect(content.dogfood_run.feature_intent).toBe(
      "Refine the JudgmentKit.com landing page for copy distinctness and human-first onboarding",
    );
    expect(content.dogfood_run.draft).toContain("Sections: hero");
    expect(content.dogfood_run.draft).toContain("Copy drift:");
    expect(content.dogfood_run.refinement_goal).toBe(
      "copy distinctness, clarity, and first-time usability for buyers and operators",
    );
    expect(content.dogfood_run.known_issues).toContain(
      "Connect appears as both a primary action and a descriptive section label",
    );
    expect(content.dogfood_run.bundle_call).toContain(
      'feature_intent: "Refine the JudgmentKit.com landing page for copy distinctness and human-first onboarding"',
    );
    expect(content.dogfood_run.refinement_prompt).toContain(
      "Use JudgmentKit to refine a first design pass",
    );
    expect(content.dogfood_run.refinement_prompt).toContain(
      "review_checklist",
    );
    expect(content.dogfood_run.v2_brief).toContain(
      "Build a clearer JudgmentKit landing page for human buyers and operators.",
    );
    expect(content.dogfood_run.v2_generation_prompt).toContain(
      "Build a clearer JudgmentKit landing page for human buyers and operators.",
    );
    expect(content.dogfood_run.guardrail_call).toBe(
      'get_resource({ id: "guardrail.ui-copy-clarity" })',
    );
    expect(content.dogfood_run.brand_tone_good_judgment).toContain(
      "Give each UI copy element one clear role",
    );
    expect(content.context_call).toContain(
      'feature_intent: "Refine the JudgmentKit.com landing page for copy distinctness and human-first onboarding"',
    );
  });

  it("keeps raw machine links out of the homepage body", async () => {
    const content = await loadLandingPage("https://judgmentkit.ai/mcp");
    const markup = renderToStaticMarkup(createElement(LandingPage, { content }));

    expect(markup).toContain("Put your standards in the path of AI work.");
    expect(markup).toContain("Connect JudgmentKit");
    expect(markup).toContain("Install in your AI client");
    expect(markup).toContain('id="workflow"');
    expect(markup).toContain("From first draft to next pass.");
    expect(markup).toContain("See what guides the review.");
    expect(markup).toContain("Every review starts from your published standards. Not improvisation.");
    expect(markup).toContain("Connect first. Use raw references only when you need proof.");
    expect(markup).toContain("View raw references");
    expect(markup).toContain('href="/inspect"');
    expect(markup).not.toContain("rounded-full");
    expect(markup).not.toContain("rounded-[1.4rem]");
    expect(markup).not.toContain("shadow-[");
    expect(markup).not.toContain("bg-gradient");
    expect(markup).not.toContain("What it is");
    expect(markup).not.toContain("The refinement loop");
    expect(markup).not.toContain("Current v2 target");
    expect(markup).not.toContain("Show config and prompts");
    expect(markup).not.toContain("Dogfooded on this page");
    expect(markup).not.toContain("Feature intent");
    expect(markup).not.toContain("Draft packet");
    expect(markup).not.toContain("Review checklist");
    expect(markup).not.toContain("Inspect artifact");
    expect(markup).not.toContain("guardrail.brand-tone");
    expect(markup).not.toContain("Choose the client your team already uses.");
    expect(markup).not.toContain("Use the client your team already has.");
    expect(markup).not.toContain("Once your team chooses JudgmentKit");
    expect(markup).not.toContain(
      "JudgmentKit gives teams one repeatable path from first draft to the next pass without restating the same standards every time.",
    );
    expect(markup).not.toContain("get_workflow_bundle(");
    expect(markup).not.toContain("get_resource({");
    expect(markup).not.toContain("get_example({");
    expect(markup).not.toContain("/remotion");
    expect(markup).not.toContain('href="/mcp"');
    expect(markup).not.toContain('href="/mcp-inventory.json"');
    expect(markup).not.toContain('href="/resources/index.json"');
    expect(markup).not.toContain('href="/resources/workflows/ai-ui-generation.v1.json"');
  });

  it("uses an explicit mobile single-column hero grid and rail containment classes", async () => {
    const content = await loadLandingPage("https://judgmentkit.ai/mcp");
    const markup = renderToStaticMarkup(createElement(LandingPage, { content }));

    expect(markup).toContain('class="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8"');
    expect(markup).toContain('class="min-w-0 lg:col-span-5"');
    expect(markup).toContain('class="min-w-0 lg:col-span-7"');
    expect(markup).toContain('class="landing-flat-panel min-w-0 overflow-hidden"');
    expect(markup).toContain('class="section-fade min-w-0 px-4 py-4 sm:px-5 sm:py-5"');
    expect(markup).toContain('class="flex min-w-0 flex-wrap items-start justify-between gap-3"');
    expect(markup).toContain('class="theme-code-block landing-flat-code mt-4 min-w-0 overflow-x-auto px-4 py-4 text-xs leading-6 sm:text-sm"');
  });
});
