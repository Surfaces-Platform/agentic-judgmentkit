import { listPrompts, listTools } from "@/lib/mcp";
import { createCommandAnchor, type CommandKind } from "@/lib/mcp-reference-anchor";
import type { InstallContractCommandReference } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

function createDocsUrl(kind: CommandKind, name: string, siteUrl?: string) {
  const path = `/inspect#${createCommandAnchor(kind, name)}`;
  return siteUrl ? absoluteUrl(path, siteUrl) : path;
}

function getToolExampleCall(name: string) {
  switch (name) {
    case "list_resources":
      return 'list_resources({ type: "workflow" })';
    case "get_resource":
      return 'get_resource({ id: "guardrail.design-system-integrity" })';
    case "get_workflow_bundle":
      return 'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation" })';
    case "get_page_markdown":
      return 'get_page_markdown({ slug: "/docs/workflows/ai-ui-generation" })';
    case "get_example":
      return 'get_example({ id: "example.ui-generation.onboarding-clarity-drift" })';
    case "resolve_related":
      return 'resolve_related({ id: "workflow.ai-ui-generation" })';
    default:
      return undefined;
  }
}

function getPromptExampleCall(name: string) {
  switch (name) {
    case "explain_guardrail":
      return 'explain_guardrail({ resource_id: "guardrail.design-system-integrity" })';
    case "apply_guardrail_to_draft":
      return 'apply_guardrail_to_draft({ resource_id: "guardrail.ui-copy-clarity", draft: "..." })';
    case "summarize_example_incident":
      return 'summarize_example_incident({ resource_id: "example.ui-generation.onboarding-clarity-drift" })';
    case "start_design_workflow":
      return 'start_design_workflow({ feature_intent: "Generate the JudgmentKit homepage" })';
    case "start_no_design_system_workflow":
      return 'start_no_design_system_workflow({ feature_intent: "Generate a JudgmentKit-native review workspace without an external design system" })';
    case "refine_design_first_pass":
      return 'refine_design_first_pass({ feature_intent: "Refine the JudgmentKit homepage", draft: "...", refinement_goal: "first-time usability" })';
    default:
      return undefined;
  }
}

function getToolArguments(tool: ReturnType<typeof listTools>[number]) {
  const properties = tool.inputSchema?.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }

  return Object.keys(properties);
}

function createPromptReference(
  prompt: ReturnType<typeof listPrompts>[number],
  siteUrl?: string,
): InstallContractCommandReference {
  return {
    name: prompt.name,
    description: prompt.description,
    docs_url: createDocsUrl("prompt", prompt.name, siteUrl),
    arguments: prompt.arguments,
    example_call: getPromptExampleCall(prompt.name),
  };
}

function createToolReference(
  tool: ReturnType<typeof listTools>[number],
  siteUrl?: string,
): InstallContractCommandReference {
  return {
    name: tool.name,
    description: tool.description,
    docs_url: createDocsUrl("tool", tool.name, siteUrl),
    arguments: getToolArguments(tool),
    example_call: getToolExampleCall(tool.name),
  };
}

export function createCommandReferenceUrl(siteUrl?: string) {
  const path = "/inspect#commands";
  return siteUrl ? absoluteUrl(path, siteUrl) : path;
}

export function createToolReferences(siteUrl?: string) {
  return listTools().map((tool) => createToolReference(tool, siteUrl));
}

export function createPromptReferences(siteUrl?: string) {
  return listPrompts().map((prompt) => createPromptReference(prompt, siteUrl));
}
