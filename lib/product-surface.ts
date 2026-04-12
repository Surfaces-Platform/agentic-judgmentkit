import { z } from "zod";

import rawProductSurface from "@/content/product-surface.json";
import {
  CANONICAL_INSTALL_URL,
  CANONICAL_MCP_URL,
  LOCAL_JUDGMENTKIT_STDIO_COMMAND,
  ROOT_URL,
} from "@/lib/constants";
import { listPrompts, listTools } from "@/lib/mcp";
import type {
  InstallContract,
  ProductSurfaceContent,
  ProductSurfaceInstallTarget,
} from "@/lib/types";
import rawExampleArtifact from "@/public/resources/examples/ui-generation-drift.v1.json";
import rawResourceIndex from "@/public/resources/index.json";
import rawWorkflowArtifact from "@/public/resources/workflows/ai-ui-generation.v1.json";

const installTargetSchema = z.object({
  id: z.string(),
  label: z.string(),
  transport: z.enum(["http", "stdio"]),
  connection_label: z.string(),
  connection_value: z.string(),
  config_path: z.string(),
  install_note: z.string(),
  config_snippet: z.string(),
  starter_call: z.string(),
});

const productSurfaceSchema = z.object({
  product_name: z.string(),
  surface_label: z.string(),
  utility_sentence: z.string(),
  run_sequence: z.array(z.string()).min(3),
  workbench_label: z.string(),
  workbench_support: z.string(),
  proof_heading: z.string(),
  proof_support: z.string(),
  proof_notes: z.array(z.string()).min(1),
  context_heading: z.string(),
  context_support: z.string(),
  install_targets: z.array(installTargetSchema).min(1),
  inspect: z.object({
    href: z.string(),
    label: z.string(),
    description: z.string(),
  }),
  reference_links: z.array(
    z.object({
      group: z.string(),
      label: z.string(),
      url: z.string(),
      kind: z.string(),
    }),
  ),
});

const exampleArtifactSchema = z.object({
  id: z.string(),
  workflow_id: z.string(),
  scenario: z.string(),
  raw_output: z.string(),
  corrected_output: z.string(),
});

const workflowArtifactSchema = z.object({
  id: z.string(),
  common_guardrails: z.array(z.string()),
  links: z.object({
    example_ids: z.array(z.string()),
  }),
});

const resourceIndexSchema = z.object({
  resources: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      version: z.string(),
      title: z.string(),
      summary: z.string(),
      url: z.string(),
      schema_url: z.string(),
      last_reviewed: z.string(),
      tags: z.array(z.string()),
    }),
  ),
});

function toRelativeUrl(url: string) {
  return url.startsWith(ROOT_URL) ? url.replace(ROOT_URL, "") : url;
}

function createHomepageInstallPrompt() {
  return [
    "Install JudgmentKit in this client.",
    `Read ${CANONICAL_INSTALL_URL} and use that JSON to configure a local MCP server named "judgmentkit" with the real local JudgmentKit repo path on this machine.`,
    "Save the config, then reload or restart the client.",
  ].join("\n");
}

function createHomepageVerifyPrompt() {
  return [
    "Verify the local JudgmentKit install.",
    'Call MCP tools/list against the local "judgmentkit" server.',
    `Success means the returned tools match the inventory in ${CANONICAL_INSTALL_URL}.`,
  ].join("\n");
}

function resolveConfigFormat(target: ProductSurfaceInstallTarget) {
  return target.config_path.endsWith(".toml") ? "toml" : "json";
}

export function loadInstallContract(): InstallContract {
  const content = productSurfaceSchema.parse(rawProductSurface);

  return {
    version: "1.0.0",
    product_name: content.product_name,
    canonical_install_url: CANONICAL_INSTALL_URL,
    canonical_mcp_url: CANONICAL_MCP_URL,
    server_name: "judgmentkit",
    install_transport: "stdio",
    stdio_command: LOCAL_JUDGMENTKIT_STDIO_COMMAND,
    supported_clients: content.install_targets.map((target) => target.id),
    clients: content.install_targets.map((target) => ({
      id: target.id,
      label: target.label,
      transport: target.transport,
      config_path: target.config_path,
      config_format: resolveConfigFormat(target),
      config_snippet: target.config_snippet,
      install_note: target.install_note,
    })),
    verification: {
      method: "tools/list",
      server_name: "judgmentkit",
      instructions:
        'After configuring the local "judgmentkit" MCP server, call MCP tools/list against that local server to confirm the install is reachable.',
      expected_tools: listTools().map((tool) => tool.name),
      expected_prompts: listPrompts().map((prompt) => prompt.name),
    },
  };
}

export function loadProductSurface(): ProductSurfaceContent {
  const content = productSurfaceSchema.parse(rawProductSurface);
  const exampleArtifact = exampleArtifactSchema.parse(rawExampleArtifact);
  const workflowArtifact = workflowArtifactSchema.parse(rawWorkflowArtifact);
  const resourceIndex = resourceIndexSchema.parse(rawResourceIndex);
  const installContract = loadInstallContract();

  if (workflowArtifact.id !== exampleArtifact.workflow_id) {
    throw new Error("Workflow artifact does not match the published example artifact.");
  }

  const loadedContextIds = [
    workflowArtifact.id,
    ...workflowArtifact.common_guardrails,
    ...workflowArtifact.links.example_ids,
  ];

  const loaded_context = loadedContextIds.map((id) => {
    const match = resourceIndex.resources.find((resource) => resource.id === id);
    if (!match) {
      throw new Error(`Missing resource index entry for ${id}.`);
    }

    return {
      type: match.type,
      id: match.id,
      title: match.title,
      summary: match.summary,
      url: toRelativeUrl(match.url),
    };
  });

  const inspect_resources = resourceIndex.resources.map((resource) => ({
    id: resource.id,
    type: resource.type,
    version: resource.version,
    title: resource.title,
    summary: resource.summary,
    url: toRelativeUrl(resource.url),
    schema_url: toRelativeUrl(resource.schema_url),
    last_reviewed: resource.last_reviewed,
    tags: resource.tags,
  }));

  return {
    ...content,
    install_targets: content.install_targets,
    install_prompt: createHomepageInstallPrompt(),
    verify_prompt: createHomepageVerifyPrompt(),
    install_contract: installContract,
    proof: {
      workflow_id: exampleArtifact.workflow_id,
      example_id: exampleArtifact.id,
      brief_text: exampleArtifact.scenario,
      uncontrolled_text: exampleArtifact.raw_output,
      guided_text: exampleArtifact.corrected_output,
    },
    loaded_context,
    inspect_resources,
  };
}
