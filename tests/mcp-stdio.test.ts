import fs from "node:fs/promises";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

function getExpectedToolNames() {
  return [
    "list_resources",
    "get_resource",
    "get_workflow_bundle",
    "get_page_markdown",
    "get_example",
    "resolve_related",
  ];
}

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
  let stderrOutput = "";

  afterEach(async () => {
    await transport?.close();
    transport = undefined;
    client = undefined;
    stderrOutput = "";
  });

  it("launches the production stdio script and exposes the static tool catalog", async () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["mcp:stdio"]).toBe(
      "node --import tsx ./scripts/judgmentkit-mcp-stdio.ts",
    );

    transport = new StdioClientTransport({
      command: "npm",
      args: ["--prefix", process.cwd(), "run", "mcp:stdio"],
      cwd: process.cwd(),
      stderr: "pipe",
    });

    transport.stderr?.on("data", (chunk: Buffer | string) => {
      stderrOutput += chunk.toString();
    });

    client = new Client({
      name: "judgmentkit-stdio-test-client",
      version: "1.0.0",
    });

    await withTimeout(client.connect(transport), 5_000);

    const toolsResponse = await withTimeout(client.listTools(), 5_000);
    expect(toolsResponse.tools.map((tool) => tool.name)).toEqual(
      getExpectedToolNames(),
    );

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
    expect(stderrOutput).not.toContain("EPERM");
    expect(stderrOutput).not.toContain("listen");
  });
});
