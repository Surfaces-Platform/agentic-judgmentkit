import { describe, expect, it } from "vitest";

import { CANONICAL_INSTALL_URL, LOCAL_JUDGMENTKIT_STDIO_COMMAND } from "@/lib/constants";
import { GET } from "@/app/install/route";

describe("install route", () => {
  it("returns the canonical install contract for agents", async () => {
    const response = await GET();
    const result = await response.json();

    expect(result.product_name).toBe("JudgmentKit");
    expect(result.canonical_install_url).toBe(CANONICAL_INSTALL_URL);
    expect(result.stdio_command).toBe(LOCAL_JUDGMENTKIT_STDIO_COMMAND);
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
    expect(result.verification.expected_tools).toContain("get_workflow_bundle");
  });
});
