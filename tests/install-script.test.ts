import { execFile } from "node:child_process";
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

function runInstallScript(
  cwd: string,
  env: NodeJS.ProcessEnv,
  args: string[],
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(
      process.execPath,
      ["--import", "tsx", "./scripts/install-mcp.ts", ...args],
      {
        cwd,
        env,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ stdout, stderr });
      },
    );
  });
}

async function createInstallerSmokeCheckout() {
  const checkoutDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "judgmentkit-install-smoke-checkout-"),
  );

  await fs.cp(path.join(process.cwd(), "lib"), path.join(checkoutDir, "lib"), {
    recursive: true,
  });
  await fs.cp(
    path.join(process.cwd(), "content", "product-surface.json"),
    path.join(checkoutDir, "content", "product-surface.json"),
  );
  await fs.cp(
    path.join(process.cwd(), "scripts", "install-mcp.ts"),
    path.join(checkoutDir, "scripts", "install-mcp.ts"),
  );
  await fs.cp(path.join(process.cwd(), "package.json"), path.join(checkoutDir, "package.json"));
  await fs.cp(path.join(process.cwd(), "tsconfig.json"), path.join(checkoutDir, "tsconfig.json"));
  await fs.symlink(
    path.join(process.cwd(), "node_modules"),
    path.join(checkoutDir, "node_modules"),
    "dir",
  );

  return checkoutDir;
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

  it("runs the installer CLI in a checkout without generated public artifacts", async () => {
    const checkoutDir = await createInstallerSmokeCheckout();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-home-"));

    await expect(
      fs.stat(path.join(checkoutDir, "public", "resources", "index.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });

    const { stdout, stderr } = await runInstallScript(
      checkoutDir,
      {
        ...process.env,
        HOME: homeDir,
      },
      ["--client", "codex", "--dry-run"],
    );

    expect(stderr).toBe("");
    expect(stdout).toContain("JudgmentKit installer prepared client: codex");
    expect(stdout).toContain(`Checkout path: ${path.join(homeDir, "judgmentkit")}`);
    expect(stdout).toContain("Mode: dry-run/manual");
    expect(stdout).toContain("Manual fallback snippet:");
    expect(stdout).not.toContain("MODULE_NOT_FOUND");
  });
});
