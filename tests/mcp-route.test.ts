import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/mcp/route";

const GENERIC_START_DESIGN_WORKFLOW_PROMPT =
  'Use JudgmentKit for this design task. Call get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation" }) first. Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior. If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI; if that status is unknown, pause and ask first. If the brief conflicts with the design system, surface review questions and escalation items instead of silently overriding it. Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default. If the interface includes code blocks, inline viewers, inspectors, or artifact panels, also call get_resource({ id: "guardrail.surface-theme-parity" }) and use get_example({ id: "example.ui-generation.surface-theme-parity-drift" }) as calibration so those surfaces stay inside the active light/dark theme model instead of defaulting to a dark terminal treatment. Keep local controls inside or directly adjacent to the surface they govern so ownership stays obvious. Keep runtime bounded and surface review questions before inventing new patterns.';

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
    expect(result.result.messages[0].content.text).toBe(
      GENERIC_START_DESIGN_WORKFLOW_PROMPT,
    );
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
      "accessibility baseline or owner-approved review status",
    );
    expect(result.result.messages[0].content.text).toContain("pause and ask first");
  });
});
