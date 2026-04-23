import { z } from "zod";

import rawProductSurface from "@/content/product-surface.json";
import {
  CANONICAL_INSTALL_URL,
  CANONICAL_SITE_URL,
  createLocalMcpUrl,
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  HOSTED_MCP_REFERENCE_URL,
  HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
  LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
  LOCAL_JUDGMENTKIT_MCP_LOCAL_COMMAND,
  LOCAL_MCP_DEFAULT_HOST,
  LOCAL_MCP_DEFAULT_PORT,
  LOCAL_MCP_ENDPOINT_PATH,
  LOCAL_MCP_HOST_ENV,
  LOCAL_MCP_PORT_ENV,
} from "@/lib/constants";
import {
  createCommandReferenceUrl,
  createPromptReferences,
  createToolReferences,
} from "@/lib/mcp-reference";
import { listPrompts, listTools } from "@/lib/mcp";
import type {
  InstallContract,
  InstallerClientId,
  ProductSurfaceInstallTarget,
} from "@/lib/types";

const installClientIdSchema = z.enum(["codex", "claude", "cursor"]);

const installTargetSchema = z.object({
  id: installClientIdSchema,
  label: z.string(),
  config_path: z.string(),
});

const installContractSurfaceSchema = z.object({
  product_name: z.string(),
  install_targets: z.array(installTargetSchema).min(1),
});

function getSupportedClientIds(targets: { id: InstallerClientId }[]) {
  return targets.map((target) => target.id);
}

function resolveConfigFormat(target: ProductSurfaceInstallTarget) {
  return target.config_path.endsWith(".toml") ? "toml" : "json";
}

export function loadInstallContract(): InstallContract {
  const content = installContractSurfaceSchema.parse(rawProductSurface);
  const toolReference = createToolReferences(CANONICAL_SITE_URL);
  const promptReference = createPromptReferences(CANONICAL_SITE_URL);

  return {
    version: "3.0.0",
    product_name: content.product_name,
    command_reference_url: createCommandReferenceUrl(CANONICAL_SITE_URL),
    warning: `Install JudgmentKit from a local checkout over loopback HTTP via the hosted bootstrap script at ${CANONICAL_INSTALL_URL}. ${HOSTED_MCP_REFERENCE_URL} is a hosted reference/debug endpoint, not the install target.`,
    installer: {
      mode: "hosted-bootstrap",
      bootstrap_url: CANONICAL_INSTALL_URL,
      bootstrap_command: HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
      local_script_command: LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
      default_checkout_path: DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
      edits_config_by_default: true,
      supports_dry_run: true,
      supports_no_verify: true,
    },
    repository: {
      clone_url: JUDGMENTKIT_REPOSITORY_CLONE_URL,
      local_path_placeholder: LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
      install_command: LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
    },
    server_name: "judgmentkit",
    install_transport: "http",
    connection: {
      transport: "http",
      url: createLocalMcpUrl(),
      loopback_runtime: {
        start_command: LOCAL_JUDGMENTKIT_MCP_LOCAL_COMMAND,
        host: LOCAL_MCP_DEFAULT_HOST,
        port: LOCAL_MCP_DEFAULT_PORT,
        endpoint: LOCAL_MCP_ENDPOINT_PATH,
        env_overrides: {
          host: LOCAL_MCP_HOST_ENV,
          port: LOCAL_MCP_PORT_ENV,
        },
      },
    },
    supported_clients: getSupportedClientIds(content.install_targets),
    clients: content.install_targets.map((target) => ({
      id: target.id,
      label: target.label,
      config_path: target.config_path,
      config_format: resolveConfigFormat(target),
    })),
    verification: {
      method: "tools/list",
      server_name: "judgmentkit",
      endpoint: createLocalMcpUrl(),
      start_command: LOCAL_JUDGMENTKIT_MCP_LOCAL_COMMAND,
      instructions:
        `Start the local loopback server with ${LOCAL_JUDGMENTKIT_MCP_LOCAL_COMMAND}, then call MCP tools/list against ${createLocalMcpUrl()} to confirm the install is reachable. Then use ${createCommandReferenceUrl(
          CANONICAL_SITE_URL,
        )} to attach docs URLs to the returned command names.`,
      expected_tools: listTools().map((tool) => tool.name),
      expected_prompts: listPrompts().map((prompt) => prompt.name),
      tool_reference: toolReference,
      prompt_reference: promptReference,
    },
  };
}
