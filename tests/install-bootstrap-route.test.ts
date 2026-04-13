import { describe, expect, it } from "vitest";

import { GET } from "@/app/install/bootstrap/route";
import {
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
} from "@/lib/constants";

describe("install bootstrap route", () => {
  it("returns a hosted bootstrap script that delegates to the repo-local installer", async () => {
    const response = await GET();
    const script = await response.text();

    expect(response.headers.get("content-type")).toContain("text/x-shellscript");
    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain(JUDGMENTKIT_REPOSITORY_CLONE_URL);
    expect(script).toContain(DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH.replace("$HOME", "${HOME}"));
    expect(script).toContain("npm install");
    expect(script).toContain("scripts/install-mcp.ts");
    expect(script).toContain('--path "$CHECKOUT_PATH"');
    expect(script).not.toContain('"mcpServers"');
    expect(script).not.toContain("~/.codex/config.toml");
  });
});
