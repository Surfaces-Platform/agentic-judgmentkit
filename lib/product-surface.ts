import { z } from "zod";

import rawProductSurface from "@/content/product-surface.json";
import {
  CANONICAL_INSTALL_MANIFEST_URL,
  CANONICAL_INSTALL_URL,
  CANONICAL_SITE_URL,
  DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH,
  HOSTED_MCP_REFERENCE_URL,
  HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
  LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
  LOCAL_JUDGMENTKIT_STDIO_ARGS,
  ROOT_URL,
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
  ProductSurfaceContent,
  ProductSurfaceInspectFormat,
  ProductSurfaceInspectItem,
  ProductSurfaceReferenceItem,
  ProductSurfaceInstallTarget,
  ProductSurfaceReferenceLink,
} from "@/lib/types";
import rawExampleArtifact from "@/public/resources/examples/ui-generation-drift.v1.json";
import rawResourceIndex from "@/public/resources/index.json";
import rawWorkflowArtifact from "@/public/resources/workflows/ai-ui-generation.v1.json";

const installClientIdSchema = z.enum(["codex", "claude", "cursor"]);

const installTargetSchema = z.object({
  id: installClientIdSchema,
  label: z.string(),
  config_path: z.string(),
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

const INSPECT_CATEGORY_LABELS = {
  workflow: "Workflows",
  example: "Examples",
  guardrail: "Guardrails",
} as const;

const PINNED_EXAMPLE_ORDER = [
  "example.ui-generation.embellishment-drift",
  "example.ui-generation.onboarding-clarity-drift",
  "example.ui-generation.repetitive-copy-drift",
  "example.ui-generation.component-drift",
] as const;

function toRelativeUrl(url: string) {
  return url.startsWith(ROOT_URL) ? url.replace(ROOT_URL, "") : url;
}

function createHomepageInstallCommand() {
  return HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND;
}

function createHomepageVerifyPrompt() {
  return "Call MCP tools/list against the local judgmentkit server";
}

function getSupportedClientIds(targets: { id: InstallerClientId }[]) {
  return targets.map((target) => target.id);
}

function resolveConfigFormat(target: ProductSurfaceInstallTarget) {
  return target.config_path.endsWith(".toml") ? "toml" : "json";
}

function createPublishedInspectId(url: string) {
  return `published-${url.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function getPublishedItemFormat(link: ProductSurfaceReferenceLink): ProductSurfaceInspectFormat {
  if (link.url.endsWith(".json") || link.url === "/mcp") {
    return "json";
  }

  if (link.url.endsWith(".md")) {
    return "markdown";
  }

  if (link.url === "/install") {
    return "text";
  }

  return "text";
}

function createResourcePromptText(resource: {
  title: string;
  type: string;
}) {
  switch (resource.type) {
    case "workflow":
      return `Use JudgmentKit workflow "${resource.title}" for this task.
Retrieve the linked guardrails and examples, then guide the first pass.

Task:
[paste your request here]`;
    case "guardrail":
      return `Apply JudgmentKit guardrail "${resource.title}" to this draft.
Point out where it drifts, explain why, then rewrite it inside the guardrail.

Draft:
[paste your draft here]`;
    case "example":
      return `Use JudgmentKit example "${resource.title}" as calibration for this task.
Compare the raw output to the corrected output, then help me prompt the next pass.

Task:
[paste your request here]`;
    default:
      return `Use JudgmentKit artifact "${resource.title}" directly in your guidance for this task.

Task:
[paste your request here]`;
  }
}

function createPublishedPromptText(link: ProductSurfaceReferenceLink) {
  switch (link.url) {
    case "/install":
      return "Use this when you want the hosted bootstrap script that clones JudgmentKit, installs dependencies, and delegates to the repo-local installer.";
    case "/install.json":
      return "Use this when you need the machine-readable bootstrap manifest for JudgmentKit. It describes the hosted install script, the local stdio runtime contract, supported clients, and post-install verification.";
    case "/mcp-inventory.json":
      return "Use this when you want the published command inventory and inspect anchors. It is the fastest way to verify which tools and prompts the deployed JudgmentKit surface exposes.";
    case "/llms.txt":
      return "Use this when you want the machine-readable discovery listing for the public site and its published artifacts.";
    case "/resources/index.json":
      return "Use this when you want the canonical published index of workflows, guardrails, examples, and schemas before drilling into a specific artifact.";
    case "/mcp":
      return "Use this when you need the hosted MCP metadata/debug surface, not the local install target. It is for inspecting the published route contract and parity with the inventory.";
    default:
      break;
  }

  switch (link.kind) {
    case "resource":
      return `Use this when you want the raw published JSON artifact for ${link.label}. Open it to inspect the exact deployed resource outside the formatted viewer.`;
    case "markdown":
      return `Use this when you want the markdown mirror for ${link.label}. Open it when a human or agent needs the narrative doc version instead of raw JSON.`;
    case "schema":
      return `Use this when you need the published schema contract for ${link.label}. Open it to inspect or validate the expected shape of the corresponding artifact.`;
    case "endpoint":
      return `Use this when you need the hosted endpoint behind ${link.label}. Open it to inspect the published response shape rather than the inline summary.`;
    default:
      return `Use this when you need the published file behind ${link.label}. Open it to inspect the deployed artifact directly.`;
  }
}

function createInspectPrimaryItems(
  resources: z.infer<typeof resourceIndexSchema>["resources"],
) {
  const examples = resources
    .filter((resource) => resource.type === "example")
    .sort((left, right) => {
      const leftPinned = PINNED_EXAMPLE_ORDER.indexOf(left.id as (typeof PINNED_EXAMPLE_ORDER)[number]);
      const rightPinned = PINNED_EXAMPLE_ORDER.indexOf(right.id as (typeof PINNED_EXAMPLE_ORDER)[number]);

      if (leftPinned !== -1 || rightPinned !== -1) {
        if (leftPinned === -1) return 1;
        if (rightPinned === -1) return -1;
        return leftPinned - rightPinned;
      }

      return left.title.localeCompare(right.title);
    })
    .map<ProductSurfaceInspectItem>((resource) => ({
      id: resource.id,
      category: INSPECT_CATEGORY_LABELS.example,
      type: resource.type,
      version: resource.version,
      title: resource.title,
      summary: resource.summary,
      subtitle: resource.id,
      url: toRelativeUrl(resource.url),
      schema_url: toRelativeUrl(resource.schema_url),
      last_reviewed: resource.last_reviewed,
      tags: resource.tags,
      available_view_modes: ["prompt", "json", "schema"],
      default_view_mode: "prompt",
      prompt_text: createResourcePromptText(resource),
      raw_format: "json",
    }));

  const workflows = resources
    .filter((resource) => resource.type === "workflow")
    .sort((left, right) => left.title.localeCompare(right.title))
    .map<ProductSurfaceInspectItem>((resource) => ({
      id: resource.id,
      category: INSPECT_CATEGORY_LABELS.workflow,
      type: resource.type,
      version: resource.version,
      title: resource.title,
      summary: resource.summary,
      subtitle: resource.id,
      url: toRelativeUrl(resource.url),
      schema_url: toRelativeUrl(resource.schema_url),
      last_reviewed: resource.last_reviewed,
      tags: resource.tags,
      available_view_modes: ["prompt", "json", "schema"],
      default_view_mode: "prompt",
      prompt_text: createResourcePromptText(resource),
      raw_format: "json",
    }));

  const guardrails = resources
    .filter((resource) => resource.type === "guardrail")
    .sort((left, right) => left.title.localeCompare(right.title))
    .map<ProductSurfaceInspectItem>((resource) => ({
      id: resource.id,
      category: INSPECT_CATEGORY_LABELS.guardrail,
      type: resource.type,
      version: resource.version,
      title: resource.title,
      summary: resource.summary,
      subtitle: resource.id,
      url: toRelativeUrl(resource.url),
      schema_url: toRelativeUrl(resource.schema_url),
      last_reviewed: resource.last_reviewed,
      tags: resource.tags,
      available_view_modes: ["prompt", "json", "schema"],
      default_view_mode: "prompt",
      prompt_text: createResourcePromptText(resource),
      raw_format: "json",
    }));

  return [...examples, ...workflows, ...guardrails];
}

function createInspectReferenceItems(referenceLinks: ProductSurfaceReferenceLink[]) {
  return referenceLinks.map<ProductSurfaceReferenceItem>((link) => ({
    id: createPublishedInspectId(link.url),
    group: link.group,
    type: link.kind,
    title: link.label,
    summary: createPublishedPromptText(link),
    subtitle: link.url,
    url: link.url,
    raw_format: getPublishedItemFormat(link),
  }));
}

export function loadInstallContract(): InstallContract {
  const content = productSurfaceSchema.parse(rawProductSurface);
  const toolReference = createToolReferences(CANONICAL_SITE_URL);
  const promptReference = createPromptReferences(CANONICAL_SITE_URL);

  return {
    version: "3.0.0",
    product_name: content.product_name,
    manifest_url: CANONICAL_INSTALL_MANIFEST_URL,
    command_reference_url: createCommandReferenceUrl(CANONICAL_SITE_URL),
    warning: `Install JudgmentKit from a local checkout over stdio via the hosted bootstrap script at ${CANONICAL_INSTALL_URL}. ${HOSTED_MCP_REFERENCE_URL} is a hosted reference/debug endpoint, not the install target.`,
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
    install_transport: "stdio",
    connection: {
      command: "npm",
      args: LOCAL_JUDGMENTKIT_STDIO_ARGS,
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
      instructions:
        `After configuring the local "judgmentkit" MCP server, call MCP tools/list against that local server to confirm the install is reachable. Then use ${createCommandReferenceUrl(
          CANONICAL_SITE_URL,
        )} to attach docs URLs to the returned command names.`,
      expected_tools: listTools().map((tool) => tool.name),
      expected_prompts: listPrompts().map((prompt) => prompt.name),
      tool_reference: toolReference,
      prompt_reference: promptReference,
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

  const inspect_primary_items = createInspectPrimaryItems(resourceIndex.resources);
  const inspect_reference_items = createInspectReferenceItems(content.reference_links);

  return {
    ...content,
    install_targets: content.install_targets,
    install_command: createHomepageInstallCommand(),
    verify_prompt: createHomepageVerifyPrompt(),
    install_contract: installContract,
    tool_reference: createToolReferences(),
    prompt_reference: createPromptReferences(),
    proof: {
      workflow_id: exampleArtifact.workflow_id,
      example_id: exampleArtifact.id,
      brief_text: exampleArtifact.scenario,
      uncontrolled_text: exampleArtifact.raw_output,
      guided_text: exampleArtifact.corrected_output,
    },
    loaded_context,
    inspect_primary_items,
    inspect_reference_items,
  };
}
