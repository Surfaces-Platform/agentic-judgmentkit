import { describe, expect, it } from "vitest";

import {
  CANONICAL_INSTALL_URL,
  HOSTED_MCP_REFERENCE_URL,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
  LOCAL_JUDGMENTKIT_STDIO_ARGS,
} from "@/lib/constants";
import { GET } from "@/app/install/route";

describe("install route", () => {
  it("returns the canonical install contract for agents", async () => {
    const response = await GET();
    const result = await response.json();

    expect(result.product_name).toBe("JudgmentKit");
    expect(result.canonical_install_url).toBe(CANONICAL_INSTALL_URL);
    expect(result.command_reference_url).toBe("https://judgmentkit.ai/inspect#commands");
    expect(result.warning).toContain(HOSTED_MCP_REFERENCE_URL);
    expect(result.repository).toEqual({
      clone_url: JUDGMENTKIT_REPOSITORY_CLONE_URL,
      local_path_placeholder: LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
      install_command: LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
    });
    expect(result.connection).toEqual({
      command: "npm",
      args: LOCAL_JUDGMENTKIT_STDIO_ARGS,
    });
    expect(result.supported_clients).toEqual(["codex", "claude", "cursor"]);
    expect(result.clients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "codex",
          config_path: "~/.codex/config.toml",
          config_format: "toml",
        }),
        expect.objectContaining({
          id: "claude",
          config_path: ".mcp.json",
          config_format: "json",
        }),
        expect.objectContaining({
          id: "cursor",
          config_path: "~/.cursor/mcp.json",
          config_format: "json",
        }),
      ]),
    );
    expect(result.verification.method).toBe("tools/list");
    expect(result.verification.instructions).toContain("tools/list");
    expect(result.verification.tool_reference).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "get_workflow_bundle",
          docs_url: "https://judgmentkit.ai/inspect#tool-get_workflow_bundle",
        }),
      ]),
    );
    expect(result.verification.prompt_reference).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "start_design_workflow",
          docs_url: "https://judgmentkit.ai/inspect#prompt-start_design_workflow",
        }),
      ]),
    );
    expect(result.verification.expected_tools).toContain("get_workflow_bundle");
  });
});
