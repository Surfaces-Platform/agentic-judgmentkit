import { z } from "zod";

import rawProductSurface from "@/content/product-surface.json";
import { ROOT_URL } from "@/lib/constants";
import { getPrompt } from "@/lib/mcp";
import type { ProductSurfaceContent } from "@/lib/types";
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

function injectHttpEndpoint(value: string, endpoint: string) {
  return value.replaceAll("__HTTP_MCP_ENDPOINT__", endpoint);
}

function toRelativeUrl(url: string) {
  return url.startsWith(ROOT_URL) ? url.replace(ROOT_URL, "") : url;
}

export function loadProductSurface(httpMcpEndpoint: string): ProductSurfaceContent {
  const content = productSurfaceSchema.parse(rawProductSurface);
  const exampleArtifact = exampleArtifactSchema.parse(rawExampleArtifact);
  const workflowArtifact = workflowArtifactSchema.parse(rawWorkflowArtifact);
  const resourceIndex = resourceIndexSchema.parse(rawResourceIndex);
  const prompt = getPrompt("start_design_workflow");

  if ("error" in prompt) {
    throw new Error("Missing start_design_workflow prompt.");
  }

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
    first_message: prompt.template,
    starter_prompt_name: prompt.name,
    install_targets: content.install_targets.map((target) => ({
      ...target,
      connection_value: injectHttpEndpoint(target.connection_value, httpMcpEndpoint),
      config_snippet: injectHttpEndpoint(target.config_snippet, httpMcpEndpoint),
    })),
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
