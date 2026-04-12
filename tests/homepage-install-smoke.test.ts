import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/install/route";
import { CANONICAL_INSTALL_URL } from "@/lib/constants";
import { loadLandingPage } from "@/lib/landing-page";
import type { InstallContract, InstallContractClient } from "@/lib/types";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function materializeLocalPath(value: string, contract: InstallContract) {
  return value.replaceAll(
    contract.repository.local_path_placeholder,
    process.cwd(),
  );
}

function materializeConnection(contract: InstallContract) {
  return {
    command: contract.connection.command,
    args: contract.connection.args.map((argument) =>
      materializeLocalPath(argument, contract),
    ),
  };
}

function parseCodexConfigSnippet(snippet: string) {
  if (!snippet.includes("[mcp_servers.judgmentkit]")) {
    throw new Error("Codex install snippet is missing the judgmentkit server block.");
  }

  const commandMatch = snippet.match(/^\s*command\s*=\s*"([^"]+)"\s*$/m);
  const argsMatch = snippet.match(/^\s*args\s*=\s*(\[[^\n]+\])\s*$/m);

  if (!commandMatch || !argsMatch) {
    throw new Error("Codex install snippet is missing a command or args assignment.");
  }

  const args = JSON.parse(argsMatch[1]) as string[];

  return {
    command: commandMatch[1],
    args,
  };
}

function parseJsonConfigSnippet(snippet: string) {
  const parsed = JSON.parse(snippet) as {
    mcpServers?: {
      judgmentkit?: {
        command?: string;
        args?: string[];
      };
    };
  };
  const serverConfig = parsed.mcpServers?.judgmentkit;

  if (!serverConfig?.command || !Array.isArray(serverConfig.args)) {
    throw new Error("JSON install snippet is missing mcpServers.judgmentkit command/args.");
  }

  return {
    command: serverConfig.command,
    args: serverConfig.args,
  };
}

function parseClientConnection(
  contract: InstallContract,
  clientConfig: InstallContractClient,
) {
  const materializedSnippet = materializeLocalPath(
    clientConfig.config_snippet,
    contract,
  );

  if (clientConfig.config_format === "toml") {
    return parseCodexConfigSnippet(materializedSnippet);
  }

  return parseJsonConfigSnippet(materializedSnippet);
}

function createFailure(
  clientId: string,
  command: string,
  args: string[],
  stderrOutput: string,
  error: unknown,
) {
  const reason = error instanceof Error ? error.message : String(error);
  const stderr = stderrOutput.trim() || "<empty>";

  return new Error(
    `Homepage install smoke failed for ${clientId}.\nCommand: ${command} ${args.join(" ")}\nReason: ${reason}\nStderr:\n${stderr}`,
  );
}

async function loadInstallContractFromRoute() {
  const response = await GET();
  return (await response.json()) as InstallContract;
}

async function verifyClientInstall(
  contract: InstallContract,
  clientConfig: InstallContractClient,
) {
  const configuredConnection = parseClientConnection(contract, clientConfig);
  const expectedConnection = materializeConnection(contract);

  expect(configuredConnection).toEqual(expectedConnection);

  const stderrOutput: string[] = [];
  const transport = new StdioClientTransport({
    command: configuredConnection.command,
    args: configuredConnection.args,
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({
    name: `homepage-install-smoke-${clientConfig.id}`,
    version: "1.0.0",
  });

  transport.stderr?.on("data", (chunk: Buffer | string) => {
    stderrOutput.push(chunk.toString());
  });

  try {
    await withTimeout(client.connect(transport), 5_000);

    const toolsResponse = await withTimeout(client.listTools(), 5_000);
    expect(toolsResponse.tools.map((tool) => tool.name)).toEqual(
      contract.verification.expected_tools,
    );

    const promptsResponse = await withTimeout(client.listPrompts(), 5_000);
    expect(promptsResponse.prompts.map((prompt) => prompt.name)).toEqual(
      contract.verification.expected_prompts,
    );

    const promptResponse = await withTimeout(
      client.getPrompt({ name: "start_design_workflow", arguments: {} }),
      5_000,
    );

    expect(promptResponse.messages.length).toBeGreaterThan(0);
    expect(promptResponse.messages[0]?.content.type).toBe("text");
  } catch (error) {
    throw createFailure(
      clientConfig.id,
      configuredConnection.command,
      configuredConnection.args,
      stderrOutput.join(""),
      error,
    );
  } finally {
    await transport.close();
  }
}

describe("homepage install smoke", () => {
  it("keeps the homepage prompts pointed at the canonical install flow", () => {
    const content = loadLandingPage();

    expect(content.install_prompt).toContain(CANONICAL_INSTALL_URL);
    expect(content.verify_prompt).toContain("tools/list");
    expect(content.verify_prompt).toContain('"judgmentkit"');
  });

  it("turns each published client snippet into a working local MCP connection", async () => {
    const contract = await loadInstallContractFromRoute();

    expect(contract.supported_clients).toEqual(
      contract.clients.map((clientConfig) => clientConfig.id),
    );

    for (const clientConfig of contract.clients) {
      await verifyClientInstall(contract, clientConfig);
    }
  });
});
