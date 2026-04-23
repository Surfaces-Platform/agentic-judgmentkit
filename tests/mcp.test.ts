import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getPrompt,
  handleToolCall,
  listTools,
  setPublicDirOverrideForTests,
} from "@/lib/mcp";

describe("mcp tools", () => {
  afterEach(() => {
    setPublicDirOverrideForTests();
  });

  it("lists guardrail resources", async () => {
    const result = await handleToolCall("list_resources", { type: "guardrail" });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.resources).toHaveLength(13);
  });

  it("lists constraint pack resources", async () => {
    const result = await handleToolCall("list_resources", {
      type: "constraint_pack",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]?.id).toBe("constraint-pack.ai-ui-no-design-system");
  });

  it("lists guideline profile resources", async () => {
    const result = await handleToolCall("list_resources", {
      type: "guideline_profile",
    });

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((resource) => resource.id)).toEqual([
      "guideline-profile.ai-ui-generation-authority",
      "guideline-profile.ai-ui-review-checks",
    ]);
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
    expect(result.bundle.constraint_packs).toHaveLength(1);
    expect(result.bundle.guideline_profiles).toHaveLength(2);
    expect(result.bundle.examples.length).toBeGreaterThan(0);
    expect(result.bundle.constraint_packs[0].id).toBe(
      "constraint-pack.ai-ui-no-design-system",
    );
    expect(result.bundle.guideline_profiles[0].id).toBe(
      "guideline-profile.ai-ui-generation-authority",
    );
    expect(result.bundle.guideline_profiles[1].id).toBe(
      "guideline-profile.ai-ui-review-checks",
    );
    expect(
      result.bundle.guardrails.some(
        (guardrail: { id: string }) => guardrail.id === "guardrail.spec-completeness",
      ),
    ).toBe(true);
    expect(
      result.bundle.guardrails.some(
        (guardrail: { id: string }) =>
          guardrail.id === "guardrail.surface-mode-structure",
      ),
    ).toBe(true);
    expect(
      result.bundle.guardrails.some(
        (guardrail: { id: string }) =>
          guardrail.id === "guardrail.visual-planning-contract",
      ),
    ).toBe(true);
    expect(
      result.bundle.guardrails.some(
        (guardrail: { id: string }) =>
          guardrail.id === "guardrail.motion-media-purpose",
      ),
    ).toBe(true);
    expect(
      result.bundle.guardrails.some(
        (guardrail: { id: string }) =>
          guardrail.id === "guardrail.frontend-output-contract",
      ),
    ).toBe(true);
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
          example.id === "example.ui-generation.mode-structure-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.visual-planning-gap",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.motion-media-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.output-contract-gap",
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
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.surface-theme-parity-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.token-vagueness-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.primitive-sprawl-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.shallow-handoff-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.state-coverage-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.component-mapping-name-only-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.non-reusable-recipe-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.missing-accessibility-api-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.hand-authored-preview-drift",
      ),
    ).toBe(true);
    expect(
      result.bundle.examples.some(
        (example: { id: string }) =>
          example.id === "example.ui-generation.theme-binding-recipe-drift",
      ),
    ).toBe(true);
    expect(result.bundle.starter_instructions).toContain(
      "design system as the source of truth",
    );
    expect(result.bundle.starter_instructions).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(result.bundle.starter_instructions).toContain(
      "constraint-pack.ai-ui-no-design-system",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guideline-profile.ai-ui-generation-authority",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guardrail.surface-mode-structure",
    );
    expect(result.bundle.starter_instructions).toContain(
      "example.ui-generation.mode-structure-drift",
    );
    expect(result.bundle.starter_instructions).toContain("Visual Thesis");
    expect(result.bundle.starter_instructions).toContain(
      "Keep headings, labels, helper text, and CTA copy distinct in role.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Keep local controls inside or directly adjacent to the surface they govern.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guardrail.surface-theme-parity",
    );
    expect(result.bundle.starter_instructions).toContain(
      "example.ui-generation.surface-theme-parity-drift",
    );
    expect(result.bundle.starter_instructions).toContain(
      "design_system_bindings, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
    );
    expect(result.bundle.starter_instructions).toContain(
      "token_spec, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guardrail.spec-completeness",
    );
  });

  it("returns the designer starter prompt", () => {
    const prompt = getPrompt("start_design_workflow");

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toContain(
      'Call get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation" }) first.',
    );
    expect(prompt.template).toContain(
      "constraint-pack.ai-ui-no-design-system",
    );
    expect(prompt.template).toContain(
      "guideline-profile.ai-ui-generation-authority",
    );
    expect(prompt.template).toContain(
      "guardrail.surface-mode-structure",
    );
    expect(prompt.template).toContain(
      "example.ui-generation.visual-planning-gap",
    );
    expect(prompt.template).toContain(
      "design_system_bindings, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
    );
  });

  it("returns the no-design-system starter prompt", () => {
    const prompt = getPrompt("start_no_design_system_workflow");

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(prompt.template).toContain(
      "Use JudgmentKit for this no-design-system design task.",
    );
    expect(prompt.template).toContain(
      "Assume the portable JudgmentKit constraint pack is the only approved authority",
    );
    expect(prompt.template).toContain(
      "guideline-profile.ai-ui-generation-authority",
    );
    expect(prompt.template).toContain(
      "guardrail.frontend-output-contract",
    );
    expect(prompt.template).toContain("guardrail.spec-completeness");
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
    expect(prompt.template).toContain("guardrail.surface-theme-parity");
    expect(prompt.template).toContain(
      "example.ui-generation.surface-theme-parity-drift",
    );
    expect(prompt.template).toContain("guardrail.spec-completeness");
    expect(prompt.template).toContain("guardrail.surface-mode-structure");
    expect(prompt.template).toContain(
      "example.ui-generation.output-contract-gap",
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
      "constraint-pack.ai-ui-no-design-system",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guideline-profile.ai-ui-review-checks",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guardrail.motion-media-purpose",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Collapse near-duplicate UI copy before adding more language.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "Keep local controls inside or directly adjacent to the surface they govern.",
    );
    expect(result.bundle.starter_instructions).toContain(
      "guardrail.surface-theme-parity",
    );
    expect(result.bundle.starter_instructions).toContain(
      "token_spec, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
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
      'get_resource({ id: "guardrail.spec-completeness" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.surface-mode-structure" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.visual-planning-contract" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.motion-media-purpose" })',
    );
    expect(prompt.template).toContain(
      'get_resource({ id: "guardrail.frontend-output-contract" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.mode-structure-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.visual-planning-gap" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.motion-media-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.output-contract-gap" })',
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
      'get_resource({ id: "guardrail.surface-theme-parity" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.surface-theme-parity-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.token-vagueness-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.primitive-sprawl-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.shallow-handoff-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.state-coverage-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.component-mapping-name-only-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.non-reusable-recipe-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.missing-accessibility-api-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.hand-authored-preview-drift" })',
    );
    expect(prompt.template).toContain(
      'get_example({ id: "example.ui-generation.theme-binding-recipe-drift" })',
    );
    expect(prompt.template).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(prompt.template).toContain("pause and ask first");
    expect(prompt.template).toContain("place the conflict under escalate");
    expect(prompt.template).toContain("keep, fix_now, escalate, v2_brief, v2_generation_prompt, review_checklist");
    expect(prompt.template).toContain(
      "The v2_generation_prompt must require exactly these no-design-system output sections",
    );
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
          resource.id === "constraint-pack.ai-ui-no-design-system",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guideline-profile.ai-ui-generation-authority",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.design-system-integrity",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.spec-completeness",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "guardrail.surface-mode-structure",
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
          resource.id === "guardrail.surface-theme-parity",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.control-proximity-drift",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.surface-theme-parity-drift",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.token-vagueness-drift",
      ),
    ).toBe(true);
    expect(
      result.related.resources.some(
        (resource: { id: string }) =>
          resource.id === "example.ui-generation.mode-structure-drift",
      ),
    ).toBe(true);
    expect(result.related.resources.length).toBeGreaterThan(0);
  });

  it("keeps tools/list static when generated public artifacts are missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-mcp-"));
    setPublicDirOverrideForTests(tempDir);

    const result = await handleToolCall("list_resources", { type: "guardrail" });

    expect(listTools().map((tool) => tool.name)).toEqual([
      "list_resources",
      "get_resource",
      "get_workflow_bundle",
      "get_page_markdown",
      "get_example",
      "resolve_related",
    ]);
    expect("error" in result).toBe(true);
    if (!("error" in result)) {
      return;
    }

    expect(result.error.code).toBe("generated_artifacts_missing");
    expect(result.error.message).toContain(
      "Generated public artifacts missing; run `npm run generate`.",
    );
    expect(result.error.message).toContain("public/resources/index.json");
    expect(result.error.suggested_action).toContain("npm run generate");
  });

  it("reuses the actionable bootstrap error across content-backed tools", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-mcp-"));
    setPublicDirOverrideForTests(tempDir);

    const workflowResult = await handleToolCall("get_workflow_bundle", {
      workflow_id: "workflow.ai-ui-generation",
    });
    const relatedResult = await handleToolCall("resolve_related", {
      id: "workflow.ai-ui-generation",
    });

    expect("error" in workflowResult).toBe(true);
    expect("error" in relatedResult).toBe(true);
    if (!("error" in workflowResult) || !("error" in relatedResult)) {
      return;
    }

    expect(workflowResult.error.code).toBe("generated_artifacts_missing");
    expect(relatedResult.error.code).toBe("generated_artifacts_missing");
    expect(workflowResult.error.message).toContain("public/graph.json");
    expect(relatedResult.error.suggested_action).toContain("restart the local MCP server");
  });
});
