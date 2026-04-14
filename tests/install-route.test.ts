import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
} from "@/lib/constants";
import { GET } from "@/app/install/route";

function runFile(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { env, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function writeExecutable(filePath: string, contents: string) {
  await fs.writeFile(filePath, contents, "utf8");
  await fs.chmod(filePath, 0o755);
}

function parseStubLog(value: string) {
  const lines = value.trim().split("\n");
  const cwd = lines.find((line) => line.startsWith("cwd="))?.slice(4) ?? "";
  const args = lines
    .filter((line) => line.startsWith("arg"))
    .sort((left, right) => {
      const leftIndex = Number(left.match(/^arg(\d+)=/)?.[1] ?? -1);
      const rightIndex = Number(right.match(/^arg(\d+)=/)?.[1] ?? -1);
      return leftIndex - rightIndex;
    })
    .map((line) => line.replace(/^arg\d+=/, ""));

  return { cwd, args };
}

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

  it.each(["codex", "claude", "cursor"] as const)(
    "executes the bootstrap script and forwards --client %s to install-mcp",
    async (client) => {
      const response = await GET();
      const script = await response.text();

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "judgmentkit-install-route-"));
      const binDir = path.join(tempDir, "bin");
      const logDir = path.join(tempDir, "logs");
      const homeDir = path.join(tempDir, "home");
      const checkoutPath = path.join(tempDir, `checkout ${client}`);
      const scriptPath = path.join(tempDir, "install.sh");

      await fs.mkdir(binDir, { recursive: true });
      await fs.mkdir(logDir, { recursive: true });
      await fs.mkdir(homeDir, { recursive: true });

      await writeExecutable(
        path.join(binDir, "git"),
        `#!/usr/bin/env bash
set -euo pipefail
{
  printf 'cwd=%s\n' "$PWD"
  index=0
  for arg in "$@"; do
    printf 'arg%s=%s\n' "$index" "$arg"
    index=$((index + 1))
  done
} >"$LOG_DIR/git.log"
mkdir -p "$3/.git"
`,
      );

      await writeExecutable(
        path.join(binDir, "npm"),
        `#!/usr/bin/env bash
set -euo pipefail
{
  printf 'cwd=%s\n' "$PWD"
  index=0
  for arg in "$@"; do
    printf 'arg%s=%s\n' "$index" "$arg"
    index=$((index + 1))
  done
} >"$LOG_DIR/npm.log"
mkdir -p "$PWD/node_modules"
`,
      );

      await writeExecutable(
        path.join(binDir, "node"),
        `#!/usr/bin/env bash
set -euo pipefail
{
  printf 'cwd=%s\n' "$PWD"
  index=0
  for arg in "$@"; do
    printf 'arg%s=%s\n' "$index" "$arg"
    index=$((index + 1))
  done
} >"$LOG_DIR/node.log"
`,
      );

      await writeExecutable(scriptPath, script);

      await runFile("bash", [scriptPath, "--path", checkoutPath, "--client", client], {
        ...process.env,
        HOME: homeDir,
        LOG_DIR: logDir,
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
      });

      const gitLog = parseStubLog(await fs.readFile(path.join(logDir, "git.log"), "utf8"));
      const npmLog = parseStubLog(await fs.readFile(path.join(logDir, "npm.log"), "utf8"));
      const nodeLog = parseStubLog(await fs.readFile(path.join(logDir, "node.log"), "utf8"));

      expect(gitLog.args).toEqual(["clone", JUDGMENTKIT_REPOSITORY_CLONE_URL, checkoutPath]);
      expect(npmLog.cwd).toBe(checkoutPath);
      expect(npmLog.args).toEqual(["install"]);
      expect(nodeLog.cwd).toBe(checkoutPath);
      expect(nodeLog.args).toEqual([
        "--import",
        "tsx",
        "./scripts/install-mcp.ts",
        "--path",
        checkoutPath,
        "--client",
        client,
      ]);
    },
  );
});
