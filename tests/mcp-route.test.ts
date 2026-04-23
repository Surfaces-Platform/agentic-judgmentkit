import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/mcp/route";
import { getPrompt } from "@/lib/mcp";

async function postJsonRpc(payload: Record<string, unknown>) {
  const request = new Request("http://localhost:3002/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const response = await POST(request);
  return response.json();
}

async function getMetadata() {
  const request = new Request("http://localhost:3002/mcp", {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  const response = await GET(request);
  return response.json();
}

describe("mcp route prompts", () => {
  it("returns route metadata on a non-SSE GET request", async () => {
    const result = await getMetadata();

    expect(result.transport).toBe("streamable-http");
    expect(result.capabilities.tools).toBeInstanceOf(Array);
    expect(result.capabilities.prompts).toBeInstanceOf(Array);
  });

  it("lists the refinement prompt", async () => {
    const result = await postJsonRpc({
      jsonrpc: "2.0",
      id: 0,
      method: "prompts/list",
    });

    expect(result.error).toBeUndefined();
    expect(
      result.result.prompts.some(
        (prompt: { name: string }) => prompt.name === "refine_design_first_pass",
      ),
    ).toBe(true);
  });

  it("lists the no-design-system starter prompt", async () => {
    const result = await postJsonRpc({
      jsonrpc: "2.0",
      id: 10,
      method: "prompts/list",
    });

    expect(result.error).toBeUndefined();
    expect(
      result.result.prompts.some(
        (prompt: { name: string }) =>
          prompt.name === "start_no_design_system_workflow",
      ),
    ).toBe(true);
  });

  it("returns the generic start_design_workflow prompt when no arguments are provided", async () => {
    const result = await postJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "prompts/get",
      params: {
        name: "start_design_workflow",
        arguments: {},
      },
    });

    expect(result.error).toBeUndefined();
    const directPrompt = getPrompt("start_design_workflow");
    expect("error" in directPrompt).toBe(false);
    if ("error" in directPrompt) {
      return;
    }
    expect(result.result.messages[0].content.text).toBe(directPrompt.template);
  });

  it("returns a task-specific start_design_workflow prompt when feature_intent is provided", async () => {
    const result = await postJsonRpc({
      jsonrpc: "2.0",
      id: 2,
      method: "prompts/get",
      params: {
        name: "start_design_workflow",
        arguments: {
          feature_intent: "Generate the JudgmentKit.com landing page",
        },
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.result.messages[0].content.text).toContain(
      "Generate the JudgmentKit.com landing page",
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Generate the JudgmentKit.com landing page" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      "constraint-pack.ai-ui-no-design-system",
    );
    expect(result.result.messages[0].content.text).toContain(
      "guideline-profile.ai-ui-generation-authority",
    );
    expect(result.result.messages[0].content.text).toContain(
      "guardrail.surface-mode-structure",
    );
    expect(result.result.messages[0].content.text).toContain(
      "example.ui-generation.mode-structure-drift",
    );
  });

  it("returns the refinement prompt when the required arguments are provided", async () => {
    const result = await postJsonRpc({
      jsonrpc: "2.0",
      id: 3,
      method: "prompts/get",
      params: {
        name: "refine_design_first_pass",
        arguments: {
          feature_intent: "Refine the JudgmentKit.com landing page",
          draft: "Hero, install rail, proof section, inspect links in the body.",
          refinement_goal: "clarity and first-time usability",
        },
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.result.messages[0].content.text).toContain(
      "review_checklist",
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.onboarding-clarity-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.embellishment-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.ui-copy-clarity" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.spec-completeness" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.surface-mode-structure" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.visual-planning-contract" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.frontend-output-contract" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.visual-planning-gap" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.repetitive-copy-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.control-proximity" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.control-proximity-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.surface-theme-parity" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.surface-theme-parity-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.token-vagueness-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.component-mapping-name-only-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.non-reusable-recipe-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.missing-accessibility-api-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.hand-authored-preview-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.theme-binding-recipe-drift" })',
    );
    expect(result.result.messages[0].content.text).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(result.result.messages[0].content.text).toContain("pause and ask first");
  });
});
