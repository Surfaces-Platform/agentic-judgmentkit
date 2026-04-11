import { describe, expect, it } from "vitest";

import { getPrompt, handleToolCall } from "@/lib/mcp";

const GENERIC_START_DESIGN_WORKFLOW_PROMPT =
  'Use JudgmentKit for this design task. Call get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation" }) first. Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior. If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI; if that status is unknown, pause and ask first. If the brief conflicts with the design system, surface review questions and escalation items instead of silently overriding it. Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default. Keep local controls inside or directly adjacent to the surface they govern so ownership stays obvious. Keep runtime bounded and surface review questions before inventing new patterns.';

describe("mcp tools", () => {
  it("lists guardrail resources", async () => {
    const result = await handleToolCall("list_resources", { type: "guardrail" });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.resources).toHaveLength(7);
  });

  it("returns markdown mirrors for docs pages", async () => {
    const result = await handleToolCall("get_page_markdown", {
      slug: "/docs/start/what-is-judgmentkit",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.markdown).toContain("# What JudgmentKit is");
  });

  it("returns an AI UI generation workflow bundle", async () => {
    const result = await handleToolCall("get_workflow_bundle", {
      workflow_id: "workflow.ai-ui-generation",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.bundle.workflow.id).toBe("workflow.ai-ui-generation");
    expect(result.bundle.guardrails.length).toBeGreaterThan(0);
    expect(result.bundle.examples.length).toBeGreaterThan(0);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.onboarding-clarity-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.embellishment-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.repetitive-copy-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.control-proximity-drift",
      ),
    ).toBe(true);
    expect(result.bundle.starter_instructions).toContain(
      "design system as the source of truth",
    );
    expect(result.bundle.starter_instructions).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(result.bundle.starter_instructions).toContain(
      "tight 6px radius scale",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Keep headings, labels, helper text, and CTA copy distinct in role.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Keep local controls inside or directly adjacent to the surface they govern.",
    );
  });

  it("returns the designer starter prompt", () => {
    const prompt = getPrompt("start_design_workflow");

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toBe(GENERIC_START_DESIGN_WORKFLOW_PROMPT);
  });

  it("renders a task-specific design workflow prompt when feature_intent is provided", () => {
    const featureIntent = "Generate the JudgmentKit.com landing page";
    const prompt = getPrompt("start_design_workflow", {
      feature_intent: featureIntent,
      ignored_arg: "ignore me",
    });

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toContain(featureIntent);
    expect(prompt.template).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Generate the JudgmentKit.com landing page" })',
    );
    expect(prompt.template).not.toContain("ignored_arg");
  });

  it("keeps workflow bundle starter instructions aligned with task-specific prompt context", async () => {
    const featureIntent = "Generate the JudgmentKit.com landing page";
    const result = await handleToolCall("get_workflow_bundle", {
      workflow_id: "workflow.ai-ui-generation",
      feature_intent: `  ${featureIntent}  `,
    });
    const prompt = getPrompt("start_design_workflow", {
      feature_intent: featureIntent,
    });

    expect("error" in result).toBe(false);
    expect("error" in prompt).toBe(false);
    if ("error" in result || "error" in prompt) {
      return;
    }

    expect(result.bundle.starter_instructions).toContain(featureIntent);
    expect(result.bundle.starter_instructions).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Generate the JudgmentKit.com landing page" })',
    );
    expect(result.bundle.starter_instructions).toContain(
      "design system",
    );
    expect(result.bundle.starter_instructions).toContain(
      "tight 6px radius scale",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Collapse near-duplicate UI copy before adding more language.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Keep local controls inside or directly adjacent to the surface they govern.",
    );
    expect(prompt.template).toContain(featureIntent);
  });

  it("renders declared prompt arguments into output when values are provided", () => {
    const guardrailPrompt = getPrompt("explain_guardrail", {
      resource_id: "guardrail.brand-tone",
    });
    const draftPrompt = getPrompt("apply_guardrail_to_draft", {
      resource_id: "guardrail.brand-tone",
      draft: "Rewrite this homepage blurb.",
    });
    const examplePrompt = getPrompt("summarize_example_incident", {
      resource_id: "example.ui-generation.component-drift",
    });

    expect("error" in guardrailPrompt).toBe(false);
    expect("error" in draftPrompt).toBe(false);
    expect("error" in examplePrompt).toBe(false);
    if (
      "error" in guardrailPrompt ||
      "error" in draftPrompt ||
      "error" in examplePrompt
    ) {
      return;
    }

    expect(guardrailPrompt.template).toContain("guardrail.brand-tone");
    expect(draftPrompt.template).toContain("guardrail.brand-tone");
    expect(draftPrompt.template).toContain("Rewrite this homepage blurb.");
    expect(examplePrompt.template).toContain(
      "example.ui-generation.component-drift",
    );
  });

  it("renders a refinement prompt with the required packet sections", () => {
    const prompt = getPrompt("refine_design_first_pass", {
      feature_intent: "Refine the JudgmentKit.com landing page",
      draft: "Hero, install rail, proof section, inspect links in the body.",
      refinement_goal: "clarity and first-time usability",
    });

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Refine the JudgmentKit.com landing page" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.brand-tone" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.onboarding-clarity-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.embellishment-drift" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.ui-copy-clarity" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.repetitive-copy-drift" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.control-proximity" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.control-proximity-drift" })',
    );
    expect(prompt.template).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(prompt.template).toContain("pause and ask first");
    expect(prompt.template).toContain("place the conflict under escalate");
    expect(prompt.template).toContain("keep, fix_now, escalate, v2_brief, v2_generation_prompt, review_checklist");
    expect(prompt.template).not.toContain("Must keep:");
    expect(prompt.template).not.toContain("Known issues:");
  });

  it("renders optional refinement arguments only when provided", () => {
    const prompt = getPrompt("refine_design_first_pass", {
      feature_intent: "Refine the JudgmentKit.com landing page",
      draft: "Hero, install rail, proof section, inspect links in the body.",
      refinement_goal: "clarity and first-time usability",
      must_keep: "MCP-first framing; multi-client install surface",
      known_issues: "onboarding ambiguity; inspect surfaces crowd the start path",
    });

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toContain("Must keep:");
    expect(prompt.template).toContain("Known issues:");
  });

  it("resolves related docs and artifacts for a workflow resource", async () => {
    const result = await handleToolCall("resolve_related", {
      id: "workflow.ai-ui-generation",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.design-system-integrity",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.embellishment-drift",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.ui-copy-clarity",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.repetitive-copy-drift",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.control-proximity",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.control-proximity-drift",
      ),
    ).toBe(true);
    expect(result.related.resources.length).toBeGreaterThan(0);
  });
});
