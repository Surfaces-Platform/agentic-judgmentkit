import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

describe("stdio mcp server", () => {
  let transport: StdioClientTransport | undefined;
  let client: Client | undefined;

  afterEach(async () => {
    await transport?.close();
    transport = undefined;
    client = undefined;
  });

  it("responds to initialize and prompts/get over stdio", async () => {
    const cliPath = path.join(
      process.cwd(),
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs",
    );
    const scriptPath = path.join(process.cwd(), "scripts", "judgmentkit-mcp-stdio.ts");

    transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, scriptPath],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    client = new Client({
      name: "judgmentkit-stdio-test-client",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), 5_000);

    const promptResponse = await withTimeout(
      client.getPrompt({
        name: "refine_design_first_pass",
        arguments: {
          feature_intent: "Refine the JudgmentKit.com landing page",
          draft: "Hero, install rail, proof section, inspect links in the body.",
          refinement_goal: "clarity and first-time usability",
        },
      }),
      5_000,
    );

    expect(promptResponse.messages[0].content.type).toBe("text");
    if (promptResponse.messages[0].content.type !== "text") {
      return;
    }

    expect(promptResponse.messages[0].content.text).toContain(
      "Refine the JudgmentKit.com landing page",
    );
    expect(promptResponse.messages[0].content.text).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Refine the JudgmentKit.com landing page" })',
    );
    expect(promptResponse.messages[0].content.text).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(promptResponse.messages[0].content.text).toContain(
      'get_resource({ id: "guardrail.surface-theme-parity" })',
    );
    expect(promptResponse.messages[0].content.text).toContain(
      'get_example({ id: "example.ui-generation.surface-theme-parity-drift" })',
    );
    expect(promptResponse.messages[0].content.text).toContain(
      "review_checklist",
    );
  });
});
