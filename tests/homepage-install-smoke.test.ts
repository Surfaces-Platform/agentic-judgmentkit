import { describe, expect, it } from "vitest";

import { renderManualConfigSnippet, verifyInstalledMcp } from "@/lib/install-mcp";
import { loadInstallContract } from "@/lib/install-contract";
import { loadLandingPage } from "@/lib/landing-page";
import type { InstallContract, InstallContractClient } from "@/lib/types";

function parseCodexConfigSnippet(snippet: string) {
  if (!snippet.includes("[mcp_servers.judgmentkit]")) {
    throw new Error("Codex install snippet is missing the judgmentkit server block.");
  }

  const urlMatch = snippet.match(/^\s*url\s*=\s*"([^"]+)"\s*$/m);

  if (!urlMatch) {
    throw new Error("Codex install snippet is missing a URL assignment.");
  }

  return { url: urlMatch[1] };
}

function parseJsonConfigSnippet(snippet: string) {
  const parsed = JSON.parse(snippet) as {
    mcpServers?: {
      judgmentkit?: {
        url?: string;
      };
    };
  };
  const serverConfig = parsed.mcpServers?.judgmentkit;

  if (!serverConfig?.url) {
    throw new Error("JSON install snippet is missing mcpServers.judgmentkit url.");
  }

  return { url: serverConfig.url };
}

function parseClientConnection(clientConfig: InstallContractClient) {
  const materializedSnippet = renderManualConfigSnippet(clientConfig, process.cwd());

  if (clientConfig.config_format === "toml") {
    return parseCodexConfigSnippet(materializedSnippet);
  }

  return parseJsonConfigSnippet(materializedSnippet);
}

function loadInternalInstallContract(): InstallContract {
  return loadInstallContract();
}

async function verifyClientInstall(
  contract: InstallContract,
  clientConfig: InstallContractClient,
) {
  if (contract.connection.transport !== "http") {
    throw new Error("Expected HTTP install contract.");
  }

  const configuredConnection = parseClientConnection(clientConfig);

  expect(configuredConnection).toEqual({ url: contract.connection.url });
}

describe("homepage install smoke", () => {
  it("keeps the homepage prompts pointed at the canonical install flow", () => {
    const content = loadLandingPage();

    expect(content.install_options).toEqual([
      expect.objectContaining({
        id: "codex",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client codex",
      }),
      expect.objectContaining({
        id: "claude",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude",
      }),
      expect.objectContaining({
        id: "cursor",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor",
      }),
    ]);
    expect(content.install_command).toBe(
      "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client <codex|claude|cursor>",
    );
    expect(content.verify_prompt).toBe(
      "Start the local JudgmentKit loopback server, then call MCP tools/list against http://127.0.0.1:8765/mcp",
    );
  });

  it("turns each supported client config into a working local MCP connection", async () => {
    const contract = loadInternalInstallContract();

    expect(contract.supported_clients).toEqual(
      contract.clients.map((clientConfig) => clientConfig.id),
    );

    for (const clientConfig of contract.clients) {
      await verifyClientInstall(contract, clientConfig);
    }

    if (contract.connection.transport !== "http") {
      throw new Error("Expected HTTP install contract.");
    }

    await verifyInstalledMcp(process.cwd(), {
      endpoint: contract.connection.url,
      host: contract.connection.loopback_runtime.host,
      port: contract.connection.loopback_runtime.port,
    });
  });
});
