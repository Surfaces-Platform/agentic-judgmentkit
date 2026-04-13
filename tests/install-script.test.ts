import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatInstallerResult,
  installJudgmentKitMcp,
  InstallerError,
  resolveCheckoutPath,
  resolveClientConfigPath,
  upsertCodexTomlConfig,
  upsertJsonMcpConfig,
} from "@/lib/install-mcp";

async function loadFixture(name: string) {
  return fs.readFile(path.join(process.cwd(), "tests", "fixtures", "install", name), "utf8");
}

describe("install script", () => {
  it("resolves deterministic checkout and client config paths", () => {
    expect(resolveCheckoutPath(undefined, "/tmp/home")).toBe("/tmp/home/judgmentkit");
    expect(
      resolveClientConfigPath("codex", {
        homeDir: "/tmp/home",
      }),
    ).toBe("/tmp/home/.codex/config.toml");
    expect(
      resolveClientConfigPath("cursor", {
        homeDir: "/tmp/home",
      }),
    ).toBe("/tmp/home/.cursor/mcp.json");
    expect(
      resolveClientConfigPath("claude", {
        cwd: "/tmp/workspace",
        homeDir: "/tmp/home",
      }),
    ).toBe("/tmp/workspace/.mcp.json");
  });

  it("upserts the JudgmentKit block into Codex TOML without removing unrelated config", async () => {
    const existing = await loadFixture("codex-existing.toml");
    const next = upsertCodexTomlConfig(
      existing,
      `[mcp_servers.judgmentkit]
command = "npm"
args = ["--prefix", "/tmp/new-judgmentkit", "run", "mcp:stdio"]`,
    );

    expect(next).toContain('[mcp_servers.other]');
    expect(next).toContain('/tmp/new-judgmentkit');
    expect(next).not.toContain('/tmp/old-judgmentkit');
    expect(next).toContain('[projects.demo]');
  });

  it("upserts JSON MCP config and preserves unrelated keys", async () => {
    const claudeExisting = await loadFixture("claude-existing.json");
    const cursorExisting = await loadFixture("cursor-existing.json");

    const claudeNext = upsertJsonMcpConfig(claudeExisting, {
      command: "npm",
      args: ["--prefix", "/tmp/judgmentkit", "run", "mcp:stdio"],
    });
    const cursorNext = upsertJsonMcpConfig(cursorExisting, {
      command: "npm",
      args: ["--prefix", "/tmp/judgmentkit", "run", "mcp:stdio"],
    });

    expect(JSON.parse(claudeNext).mcpServers.other.command).toBe("node");
    expect(JSON.parse(claudeNext).mcpServers.judgmentkit.args[1]).toBe("/tmp/judgmentkit");
    expect(JSON.parse(cursorNext).mcpServers.other.command).toBe("node");
    expect(JSON.parse(cursorNext).theme).toBe("dark");
  });

  it("fails safely on malformed JSON config and reports manual fallback context", async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-home-"));
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-workspace-"));
    const configPath = path.join(workspaceDir, ".mcp.json");
    await fs.writeFile(configPath, await loadFixture("malformed.json"), "utf8");

    await expect(
      installJudgmentKitMcp(
        {
          client: "claude",
          checkoutPath: process.cwd(),
          configPath,
          cwd: workspaceDir,
          noVerify: true,
        },
        {
          homeDir: () => homeDir,
          runCommand: async () => undefined,
        },
      ),
    ).rejects.toMatchObject({
      phase: "config",
    });
  });

  it("installs into temp client configs and verifies tools/list against the current checkout", async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-home-"));
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-workspace-"));
    const clients = ["codex", "claude", "cursor"] as const;

    for (const client of clients) {
      const result = await installJudgmentKitMcp(
        {
          client,
          checkoutPath: process.cwd(),
          cwd: workspaceDir,
        },
        {
          homeDir: () => homeDir,
          runCommand: async () => undefined,
        },
      );

      expect(result.wroteConfig).toBe(true);
      expect(result.verified).toBe(true);
      expect(formatInstallerResult(result)).toContain("Manual fallback snippet:");
      const writtenConfig = await fs.readFile(result.configPath, "utf8");
      expect(writtenConfig).toContain("judgmentkit");
      expect(writtenConfig).toContain(process.cwd());
    }
  });
});
