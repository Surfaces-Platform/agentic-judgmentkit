import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
} from "@/lib/constants";
import { GET } from "@/app/install/route";

describe("install route", () => {
  it("returns the hosted bootstrap script", async () => {
    const response = await GET();
    const script = await response.text();

    expect(response.headers.get("content-type")).toContain("text/x-shellscript");
    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain(JUDGMENTKIT_REPOSITORY_CLONE_URL);
    expect(script).toContain(DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH.replace("$HOME", "${HOME}"));
    expect(script).toContain("npm install");
    expect(script).toContain("scripts/install-mcp.ts");
    expect(script).toContain('--path "$CHECKOUT_PATH"');
    expect(script).not.toContain("install/bootstrap");
    expect(script).not.toContain("install.json");
    expect(script).not.toContain('"mcpServers"');
    expect(script).not.toContain("~/.codex/config.toml");
  });
});
