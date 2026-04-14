import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
} from "@/lib/constants";
import { loadInstallContract } from "@/lib/install-contract";
import type { InstallContract, InstallContractClient, InstallerClientId } from "@/lib/types";

type RunCommandOptions = {
  cwd?: string;
};

type InstallDependencies = {
  fs: typeof fs;
  homeDir: () => string;
  now: () => Date;
  runCommand: (command: string, args: string[], options?: RunCommandOptions) => Promise<void>;
};

export type InstallerCliOptions = {
  client: InstallerClientId;
  checkoutPath?: string;
  configPath?: string;
  dryRun?: boolean;
  manual?: boolean;
  noVerify?: boolean;
  cwd?: string;
};

export type InstallResult = {
  client: InstallerClientId;
  checkoutPath: string;
  configPath: string;
  backupPath?: string;
  wroteConfig: boolean;
  verified: boolean;
  manualSnippet: string;
  command: {
    command: string;
    args: string[];
  };
};

export class InstallerError extends Error {
  constructor(
    readonly phase: "args" | "clone" | "install" | "config" | "verify",
    message: string,
    readonly manualSnippet?: string,
  ) {
    super(message);
    this.name = "InstallerError";
  }
}

const DEFAULT_DEPS: InstallDependencies = {
  fs,
  homeDir: () => os.homedir(),
  now: () => new Date(),
  runCommand: (command, args, options) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options?.cwd,
        stdio: ["ignore", "ignore", "pipe"],
      });

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `${command} ${args.join(" ")} exited with code ${code}. ${stderr.trim()}`.trim(),
          ),
        );
      });
    }),
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

function normalizeClient(value: string | undefined): InstallerClientId {
  if (value === "codex" || value === "claude" || value === "cursor") {
    return value;
  }

  throw new InstallerError(
    "args",
    "Missing or invalid --client. Use one of: codex, claude, cursor.",
  );
}

function expandHomePath(value: string, homeDir: string) {
  return value.startsWith("~/") ? path.join(homeDir, value.slice(2)) : value;
}

export function parseInstallerArgs(argv: string[]): InstallerCliOptions {
  let client: InstallerClientId | undefined;
  let checkoutPath: string | undefined;
  let configPath: string | undefined;
  let dryRun = false;
  let manual = false;
  let noVerify = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--client":
        client = normalizeClient(argv[index + 1]);
        index += 1;
        break;
      case "--path":
        checkoutPath = argv[index + 1];
        index += 1;
        break;
      case "--config-path":
        configPath = argv[index + 1];
        index += 1;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--manual":
        manual = true;
        break;
      case "--no-verify":
        noVerify = true;
        break;
      case "--help":
        throw new InstallerError(
          "args",
          "Usage: node --import tsx ./scripts/install-mcp.ts --client <codex|claude|cursor> [--path <checkout-path>] [--config-path <path>] [--dry-run] [--manual] [--no-verify]",
        );
      default:
        if (argument.startsWith("--")) {
          throw new InstallerError("args", `Unknown argument: ${argument}`);
        }
        break;
    }
  }

  return {
    client: normalizeClient(client),
    checkoutPath,
    configPath,
    dryRun,
    manual,
    noVerify,
  };
}

export function resolveCheckoutPath(checkoutPath: string | undefined, homeDir: string) {
  return checkoutPath ? expandHomePath(checkoutPath, homeDir) : path.join(homeDir, "judgmentkit");
}

export function resolveClientConfigPath(
  client: InstallerClientId,
  options: {
    configPath?: string;
    cwd?: string;
    homeDir: string;
  },
) {
  if (options.configPath) {
    return path.resolve(expandHomePath(options.configPath, options.homeDir));
  }

  switch (client) {
    case "codex":
      return path.join(options.homeDir, ".codex", "config.toml");
    case "cursor":
      return path.join(options.homeDir, ".cursor", "mcp.json");
    case "claude":
      return path.join(options.cwd ?? process.cwd(), ".mcp.json");
  }
}

function materializeLocalPath(value: string, contract: InstallContract, checkoutPath: string) {
  return value.replaceAll(contract.repository.local_path_placeholder, checkoutPath);
}

function materializeConnection(contract: InstallContract, checkoutPath: string) {
  return {
    command: contract.connection.command,
    args: contract.connection.args.map((argument) =>
      materializeLocalPath(argument, contract, checkoutPath),
    ),
  };
}

function getClientContract(
  contract: InstallContract,
  client: InstallerClientId,
): InstallContractClient {
  const target = contract.clients.find((entry) => entry.id === client);
  if (!target) {
    throw new InstallerError("args", `Unsupported client: ${client}`);
  }

  return target;
}

export function renderManualConfigSnippet(client: InstallContractClient, checkoutPath: string) {
  const connection = materializeConnection(loadInstallContract(), checkoutPath);

  if (client.config_format === "toml") {
    return `[mcp_servers.judgmentkit]
command = "${connection.command}"
args = ${JSON.stringify(connection.args)}`;
  }

  return `${JSON.stringify(
    {
      mcpServers: {
        judgmentkit: connection,
      },
    },
    null,
    2,
  )}\n`;
}

export function upsertCodexTomlConfig(existingText: string, judgmentKitBlock: string) {
  const normalized = existingText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const matchIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^\[mcp_servers\.judgmentkit\]\s*$/.test(line.trim())) {
      indexes.push(index);
    }

    return indexes;
  }, []);

  if (matchIndexes.length > 1) {
    throw new InstallerError(
      "config",
      "Codex config contains multiple [mcp_servers.judgmentkit] blocks; edit it manually.",
    );
  }

  const blockLines = judgmentKitBlock.trim().split("\n");

  if (matchIndexes.length === 1) {
    const start = matchIndexes[0];
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      if (/^\[[^\]]+\]\s*$/.test(lines[index].trim())) {
        end = index;
        break;
      }
    }

    return [...lines.slice(0, start), ...blockLines, ...lines.slice(end)].join("\n").trimEnd() + "\n";
  }

  const prefix = normalized.trimEnd();
  return `${prefix}${prefix ? "\n\n" : ""}${judgmentKitBlock.trim()}\n`;
}

export function upsertJsonMcpConfig(existingText: string, serverConfig: { command: string; args: string[] }) {
  const trimmed = existingText.trim();
  const parsed = trimmed.length > 0 ? JSON.parse(trimmed) : {};

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new InstallerError("config", "Client config must contain a JSON object.");
  }

  const root = parsed as {
    mcpServers?: Record<string, { command: string; args: string[] }>;
  };

  if (
    root.mcpServers !== undefined &&
    (typeof root.mcpServers !== "object" || root.mcpServers === null || Array.isArray(root.mcpServers))
  ) {
    throw new InstallerError("config", "Client config field mcpServers must be an object.");
  }

  root.mcpServers = {
    ...(root.mcpServers ?? {}),
    judgmentkit: serverConfig,
  };

  return `${JSON.stringify(root, null, 2)}\n`;
}

async function pathExists(fsImpl: typeof fs, targetPath: string) {
  try {
    await fsImpl.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureCheckout(
  checkoutPath: string,
  deps: InstallDependencies,
) {
  if (!(await pathExists(deps.fs, checkoutPath))) {
    await deps.fs.mkdir(path.dirname(checkoutPath), { recursive: true });
    try {
      await deps.runCommand("git", ["clone", JUDGMENTKIT_REPOSITORY_CLONE_URL, checkoutPath]);
    } catch (error) {
      throw new InstallerError("clone", `Failed to clone JudgmentKit into ${checkoutPath}: ${String(error)}`);
    }
    return;
  }

  if (!(await pathExists(deps.fs, path.join(checkoutPath, ".git")))) {
    throw new InstallerError(
      "clone",
      `Checkout path ${checkoutPath} exists but is not a Git checkout.`,
    );
  }
}

async function ensureDependencies(checkoutPath: string, deps: InstallDependencies) {
  if (await pathExists(deps.fs, path.join(checkoutPath, "node_modules"))) {
    return;
  }

  try {
    await deps.runCommand("npm", ["install"], { cwd: checkoutPath });
  } catch (error) {
    throw new InstallerError(
      "install",
      `Failed to install npm dependencies in ${checkoutPath}: ${String(error)}`,
    );
  }
}

async function writeClientConfig(
  client: InstallContractClient,
  configPath: string,
  checkoutPath: string,
  deps: InstallDependencies,
) {
  const manualSnippet = renderManualConfigSnippet(client, checkoutPath);
  const connection = materializeConnection(loadInstallContract(), checkoutPath);
  const existingText = (await pathExists(deps.fs, configPath))
    ? await deps.fs.readFile(configPath, "utf8")
    : "";

  let nextText: string;
  try {
    if (client.config_format === "toml") {
      nextText = upsertCodexTomlConfig(existingText, manualSnippet);
    } else {
      nextText = upsertJsonMcpConfig(existingText, connection);
    }
  } catch (error) {
    if (error instanceof InstallerError) {
      throw new InstallerError("config", error.message, manualSnippet);
    }

    throw new InstallerError(
      "config",
      `Failed to update ${configPath}: ${String(error)}`,
      manualSnippet,
    );
  }

  await deps.fs.mkdir(path.dirname(configPath), { recursive: true });

  let backupPath: string | undefined;
  if (existingText.length > 0) {
    const stamp = deps.now().toISOString().replace(/[:.]/g, "-");
    backupPath = `${configPath}.bak.${stamp}`;
    await deps.fs.copyFile(configPath, backupPath);
  }

  try {
    await deps.fs.writeFile(configPath, nextText, "utf8");
  } catch (error) {
    throw new InstallerError(
      "config",
      `Failed to write client config at ${configPath}: ${String(error)}`,
      manualSnippet,
    );
  }

  return {
    backupPath,
    manualSnippet,
  };
}

export async function verifyInstalledMcp(checkoutPath: string) {
  const contract = loadInstallContract();
  const connection = materializeConnection(contract, checkoutPath);
  const stderrOutput: string[] = [];
  const transport = new StdioClientTransport({
    command: connection.command,
    args: connection.args,
    cwd: checkoutPath,
    stderr: "pipe",
  });

  transport.stderr?.on("data", (chunk: Buffer | string) => {
    stderrOutput.push(chunk.toString());
  });

  const client = new Client({
    name: "judgmentkit-install-verifier",
    version: "1.0.0",
  });

  try {
    await withTimeout(client.connect(transport), 5_000);
    const toolsResponse = await withTimeout(client.listTools(), 5_000);
    const toolNames = toolsResponse.tools.map((tool) => tool.name);
    const expected = contract.verification.expected_tools;
    if (JSON.stringify(toolNames) !== JSON.stringify(expected)) {
      throw new Error(
        `Unexpected tools/list response. Expected ${expected.join(", ")} but received ${toolNames.join(", ")}.`,
      );
    }
  } catch (error) {
    throw new InstallerError(
      "verify",
      `Failed to verify the local JudgmentKit MCP install: ${String(error)} ${stderrOutput.join("").trim()}`.trim(),
    );
  } finally {
    await transport.close();
  }
}

export async function installJudgmentKitMcp(
  options: InstallerCliOptions,
  overrides: Partial<InstallDependencies> = {},
): Promise<InstallResult> {
  const deps = {
    ...DEFAULT_DEPS,
    ...overrides,
  };
  const contract = loadInstallContract();
  const checkoutPath = resolveCheckoutPath(options.checkoutPath, deps.homeDir());
  const client = getClientContract(contract, options.client);
  const configPath = resolveClientConfigPath(client.id, {
    configPath: options.configPath,
    cwd: options.cwd,
    homeDir: deps.homeDir(),
  });
  const manualSnippet = renderManualConfigSnippet(client, checkoutPath);
  const connection = materializeConnection(contract, checkoutPath);

  if (options.dryRun || options.manual) {
    return {
      client: client.id,
      checkoutPath,
      configPath,
      wroteConfig: false,
      verified: false,
      manualSnippet,
      command: connection,
    };
  }

  await ensureCheckout(checkoutPath, deps);
  await ensureDependencies(checkoutPath, deps);
  const configResult = await writeClientConfig(client, configPath, checkoutPath, deps);

  if (!options.noVerify) {
    await verifyInstalledMcp(checkoutPath);
  }

  return {
    client: client.id,
    checkoutPath,
    configPath,
    backupPath: configResult.backupPath,
    wroteConfig: true,
    verified: !options.noVerify,
    manualSnippet,
    command: connection,
  };
}

export function formatInstallerResult(result: InstallResult) {
  const lines = [
    `JudgmentKit installer prepared client: ${result.client}`,
    `Checkout path: ${result.checkoutPath}`,
    `Config path: ${result.configPath}`,
    `Command: ${result.command.command} ${result.command.args.join(" ")}`,
  ];

  if (result.backupPath) {
    lines.push(`Backup: ${result.backupPath}`);
  }

  if (!result.wroteConfig) {
    lines.push("Mode: dry-run/manual");
  }

  if (result.verified) {
    lines.push("Verification: tools/list succeeded");
  }

  lines.push("", "Manual fallback snippet:", result.manualSnippet);
  return `${lines.join("\n")}\n`;
}
