import { describe, expect, it } from "vitest";

import { GET } from "@/app/install.json/route";
import {
  CANONICAL_INSTALL_MANIFEST_URL,
  CANONICAL_INSTALL_URL,
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
  LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
  LOCAL_JUDGMENTKIT_STDIO_ARGS,
} from "@/lib/constants";

describe("install manifest route", () => {
  it("returns the thin machine-readable install manifest", async () => {
    const response = await GET();
    const result = await response.json();

    expect(result.version).toBe("3.0.0");
    expect(result.product_name).toBe("JudgmentKit");
    expect(result.manifest_url).toBe(CANONICAL_INSTALL_MANIFEST_URL);
    expect(result.command_reference_url).toBe("https://judgmentkit.ai/inspect#commands");
    expect(result.warning).toContain(CANONICAL_INSTALL_URL);
    expect(result.installer).toEqual({
      mode: "hosted-bootstrap",
      bootstrap_url: CANONICAL_INSTALL_URL,
      bootstrap_command: HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
      local_script_command: LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
      default_checkout_path: DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
      edits_config_by_default: true,
      supports_dry_run: true,
      supports_no_verify: true,
    });
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
    expect(result.clients).toEqual([
      {
        id: "codex",
        label: "Codex",
        config_path: "~/.codex/config.toml",
        config_format: "toml",
      },
      {
        id: "claude",
        label: "Claude",
        config_path: ".mcp.json",
        config_format: "json",
      },
      {
        id: "cursor",
        label: "Cursor",
        config_path: "~/.cursor/mcp.json",
        config_format: "json",
      },
    ]);
    expect(result.clients[0]).not.toHaveProperty("config_snippet");
    expect(result.clients[0]).not.toHaveProperty("install_note");
    expect(result.verification.method).toBe("tools/list");
    expect(result.verification.instructions).toContain("tools/list");
    expect(result.verification.expected_tools).toContain("get_workflow_bundle");
  });
});
