import fs from "node:fs/promises";
import path from "node:path";

import { PUBLIC_DIR, ROOT_URL } from "@/lib/constants";
import type { GraphNode, ResourceIndex, ResourceIndexEntry } from "@/lib/types";

type ToolArgs = Record<string, unknown>;
type JsonRecord = Record<string, unknown>;
type PromptDefinition = {
  name: string;
  description: string;
  arguments: string[];
  template: string;
};

const GENERIC_START_DESIGN_WORKFLOW_PROMPT =
  'Use JudgmentKit for this design task. Call get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation" }) first. Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior. If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI; if that status is unknown, pause and ask first. If the brief conflicts with the design system, surface review questions and escalation items instead of silently overriding it. Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default. If the interface includes code blocks, inline viewers, inspectors, or artifact panels, also call get_resource({ id: "guardrail.surface-theme-parity" }) and use get_example({ id: "example.ui-generation.surface-theme-parity-drift" }) as calibration so those surfaces stay inside the active light/dark theme model instead of defaulting to a dark terminal treatment. Keep local controls inside or directly adjacent to the surface they govern so ownership stays obvious. Keep runtime bounded and surface review questions before inventing new patterns.';

const REFINE_DESIGN_FIRST_PASS_PROMPT_NAME = "refine_design_first_pass";
const GENERATED_ARTIFACTS_MISSING_MESSAGE =
  "Generated public artifacts missing; run `npm run generate`.";
const GENERATED_ARTIFACTS_MISSING_ACTION =
  "Run `npm run generate`, then restart the stdio server and retry the tool call.";
const REQUIRED_PUBLIC_ARTIFACTS = [
  { parts: ["resources", "index.json"], label: "public/resources/index.json" },
  { parts: ["graph.json"], label: "public/graph.json" },
  { parts: ["docs"], label: "public/docs" },
] as const;

class GeneratedArtifactsMissingError extends Error {
  readonly code = "generated_artifacts_missing";

  constructor(readonly missingPaths: string[]) {
    super(
      `${GENERATED_ARTIFACTS_MISSING_MESSAGE} Missing: ${missingPaths.join(", ")}.`,
    );
    this.name = "GeneratedArtifactsMissingError";
  }
}

let publicDirOverride: string | undefined;
let generatedArtifactsCheck: Promise<void> | undefined;

function resolvePublicDir() {
  return publicDirOverride ?? PUBLIC_DIR;
}

async function statPublicPath(...parts: string[]) {
  const filePath = path.join(resolvePublicDir(), ...parts);
  await fs.stat(filePath);
}

async function ensureGeneratedArtifactsAvailable() {
  const pendingCheck =
    generatedArtifactsCheck ??
    (generatedArtifactsCheck = (async () => {
      const missingPaths: string[] = [];

      for (const artifact of REQUIRED_PUBLIC_ARTIFACTS) {
        try {
          await statPublicPath(...artifact.parts);
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
            missingPaths.push(artifact.label);
            continue;
          }

          throw error;
        }
      }

      if (missingPaths.length > 0) {
        throw new GeneratedArtifactsMissingError(missingPaths);
      }
    })());

  try {
    await pendingCheck;
  } catch (error) {
    generatedArtifactsCheck = undefined;
    throw error;
  }
}

function isGeneratedArtifactsMissingError(
  error: unknown,
): error is GeneratedArtifactsMissingError {
  return error instanceof GeneratedArtifactsMissingError;
}

async function readJson<T>(...parts: string[]) {
  await ensureGeneratedArtifactsAvailable();
  const filePath = path.join(resolvePublicDir(), ...parts);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readText(...parts: string[]) {
  await ensureGeneratedArtifactsAvailable();
  const filePath = path.join(resolvePublicDir(), ...parts);
  return fs.readFile(filePath, "utf8");
}

function responseEnvelope(payload: Record<string, unknown>) {
  return {
    ...payload,
    source_url: `${ROOT_URL}/mcp`,
    retrieved_at: new Date().toISOString(),
    status: payload.status ?? "active",
  };
}

function createError(code: string, message: string, suggestedAction: string) {
  return {
    error: {
      code,
      message,
      suggested_action: suggestedAction,
    },
  };
}

function createGeneratedArtifactsMissingResponse(error: GeneratedArtifactsMissingError) {
  return createError(
    error.code,
    error.message,
    GENERATED_ARTIFACTS_MISSING_ACTION,
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter(Boolean)
    : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getResourceRelativePath(url: string) {
  return url.replace(`${ROOT_URL}/resources/`, "");
}

async function readResourceFromEntry(entry: ResourceIndexEntry) {
  return readJson<JsonRecord>("resources", getResourceRelativePath(entry.url));
}

function extractSemanticRelations(resource: JsonRecord) {
  const links = isRecord(resource.links) ? resource.links : {};
  const appliesTo = isRecord(resource.applies_to) ? resource.applies_to : {};

  return [
    ...stringArray(resource.common_guardrails),
    ...stringArray(resource.guardrail_ids),
    ...stringArray(resource.workflows),
    ...stringArray(appliesTo.workflows),
    ...stringArray(resource.example_ids),
    ...stringArray(links.example_ids),
    ...stringArray(
      typeof resource.workflow_id === "string" ? [resource.workflow_id] : [],
    ),
    stringValue(links.schema_url).replace(ROOT_URL, ""),
  ].filter(Boolean);
}

function renderWorkflowBundleCall(workflowId: string, featureIntent?: string) {
  if (!featureIntent) {
    return `get_workflow_bundle({ workflow_id: "${workflowId}" })`;
  }

  return `get_workflow_bundle({ workflow_id: "${workflowId}", feature_intent: ${JSON.stringify(
    featureIntent,
  )} })`;
}

function renderStartDesignWorkflowPrompt(featureIntent?: string) {
  if (!featureIntent) {
    return GENERIC_START_DESIGN_WORKFLOW_PROMPT;
  }

  return `Use JudgmentKit for this design task: ${featureIntent}. Call ${renderWorkflowBundleCall(
    "workflow.ai-ui-generation",
    featureIntent,
  )} first. Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior. If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI; if that status is unknown, pause and ask first. If the brief conflicts with the design system, surface review questions and escalation items instead of silently overriding it. Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default. If the interface includes code blocks, inline viewers, inspectors, or artifact panels, also call get_resource({ id: "guardrail.surface-theme-parity" }) and use get_example({ id: "example.ui-generation.surface-theme-parity-drift" }) as calibration so those surfaces stay inside the active light/dark theme model instead of defaulting to a dark terminal treatment. Keep local controls inside or directly adjacent to the surface they govern so ownership stays obvious. Keep runtime bounded and surface review questions before inventing new patterns.`;
}

function renderPromptTemplate(prompt: PromptDefinition, args: ToolArgs = {}) {
  switch (prompt.name) {
    case "explain_guardrail": {
      const resourceId = optionalStringValue(args.resource_id);
      return resourceId
        ? `${prompt.template} Resource id: ${JSON.stringify(resourceId)}.`
        : prompt.template;
    }
    case "apply_guardrail_to_draft": {
      const resourceId = optionalStringValue(args.resource_id);
      const draft = optionalStringValue(args.draft);
      const additions = [
        resourceId ? `Resource id: ${JSON.stringify(resourceId)}.` : "",
        draft ? `Draft: ${JSON.stringify(draft)}.` : "",
      ]
        .filter(Boolean)
        .join(" ");

      return additions ? `${prompt.template} ${additions}` : prompt.template;
    }
    case "summarize_example_incident": {
      const resourceId = optionalStringValue(args.resource_id);
      return resourceId
        ? `${prompt.template} Resource id: ${JSON.stringify(resourceId)}.`
        : prompt.template;
    }
    case "start_design_workflow":
      return renderStartDesignWorkflowPrompt(optionalStringValue(args.feature_intent));
    default:
      return prompt.template;
  }
}

function renderRefineDesignFirstPassPrompt(args: ToolArgs) {
  const featureIntent = optionalStringValue(args.feature_intent);
  const draft = optionalStringValue(args.draft);
  const refinementGoal = optionalStringValue(args.refinement_goal);
  const mustKeep = optionalStringValue(args.must_keep);
  const knownIssues = optionalStringValue(args.known_issues);

  if (!featureIntent) {
    return createError(
      "invalid_request",
      "refine_design_first_pass requires feature_intent.",
      "Provide the feature or surface being refined.",
    );
  }

  if (!draft) {
    return createError(
      "invalid_request",
      "refine_design_first_pass requires draft.",
      "Provide a compact summary or excerpt of the current first pass.",
    );
  }

  if (!refinementGoal) {
    return createError(
      "invalid_request",
      "refine_design_first_pass requires refinement_goal.",
      "Provide the primary optimization target, such as clarity or onboarding.",
    );
  }

  const additions = [
    mustKeep ? `Must keep: ${JSON.stringify(mustKeep)}.` : "",
    knownIssues ? `Known issues: ${JSON.stringify(knownIssues)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `Use JudgmentKit to refine a first design pass for this task: ${featureIntent}.`,
    `Call ${renderWorkflowBundleCall("workflow.ai-ui-generation", featureIntent)} first.`,
    "Review the draft against the workflow starter instructions and linked guardrails.",
    "Check whether the current repo, prompt, or brief references a design system. If it does, treat that system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior.",
    "Before proposing UI changes against a referenced design system, ask whether it has an accessibility baseline or owner-approved review status. If that status is unknown, pause and ask first.",
    "If the brief conflicts with the design system, place the conflict under escalate instead of silently overriding it.",
    "Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default.",
    'If the draft contains interface copy or product messaging, also call get_resource({ id: "guardrail.brand-tone" }).',
    'If the draft repeats or semantically overlaps headings, CTA labels, helper text, or nearby control copy, also call get_resource({ id: "guardrail.ui-copy-clarity" }) and get_example({ id: "example.ui-generation.repetitive-copy-drift" }).',
    'If local controls are spatially detached from the viewer, panel, or artifact they affect, also call get_resource({ id: "guardrail.control-proximity" }) and get_example({ id: "example.ui-generation.control-proximity-drift" }).',
    'If the draft includes code blocks, inline viewers, inspectors, or artifact panels, also call get_resource({ id: "guardrail.surface-theme-parity" }) and get_example({ id: "example.ui-generation.surface-theme-parity-drift" }).',
    'Use one or more calibration examples from the workflow bundle. If the draft resembles onboarding or artifact-exposure drift, pull get_example({ id: "example.ui-generation.onboarding-clarity-drift" }). If the draft shows decorative zero-shot chrome or misses dark/light mode readiness, pull get_example({ id: "example.ui-generation.embellishment-drift" }). If the draft keeps code or artifact surfaces on a mismatched theme, pull get_example({ id: "example.ui-generation.surface-theme-parity-drift" }).',
    `Draft: ${JSON.stringify(draft)}.`,
    `Refinement goal: ${JSON.stringify(refinementGoal)}.`,
    additions,
    "Return a structured refinement packet with exactly these sections: keep, fix_now, escalate, v2_brief, v2_generation_prompt, review_checklist.",
    "Favor first-time usability and clarity over novelty. If the request needs new primitives, unresolved accessibility gaps, or unclear tradeoffs, place them under escalate instead of improvising them.",
  ]
    .filter(Boolean)
    .join(" ");
}

function createStarterInstructions(
  workflow: JsonRecord,
  guardrails: JsonRecord[],
  examples: JsonRecord[],
  featureIntent?: string,
) {
  const workflowId = stringValue(workflow.id);
  const workflowTitle = stringValue(workflow.title);
  const guardrailIds = guardrails.map((guardrail) => stringValue(guardrail.id)).filter(Boolean);
  const exampleIds = examples.map((example) => stringValue(example.id)).filter(Boolean);
  const workflowBundleCall = renderWorkflowBundleCall(workflowId, featureIntent);

  if (workflowId === "workflow.ai-ui-generation") {
    if (featureIntent) {
      return [
        `Use ${workflowId} (${workflowTitle}) as the governing workflow for this task: ${featureIntent}.`,
        `Call ${workflowBundleCall} when starting a fresh agent session or handing the task to another agent.`,
        "Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior.",
        "If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI. If that status is unknown, pause and ask first.",
        "If the brief conflicts with the design system, surface review questions instead of silently overriding the system.",
        "Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default.",
        'If the interface includes code blocks, inline viewers, inspectors, or artifact panels, pull guardrail.surface-theme-parity and example.ui-generation.surface-theme-parity-drift so those surfaces stay inside the active theme model instead of defaulting to a dark terminal treatment.',
        "Keep headings, labels, helper text, and CTA copy distinct in role. Collapse near-duplicate UI copy before adding more language.",
        "Keep local controls inside or directly adjacent to the surface they govern. Do not park them in a separate header or metadata zone.",
        `Stay inside ${guardrailIds.join(", ")}.`,
        `Use ${exampleIds.join(", ")} as calibration for what should be rewritten or escalated.`,
        "If the request needs new primitives, unclear accessibility tradeoffs, or unlimited exploration, stop and surface review questions instead of improvising.",
      ].join(" ");
    }

    return [
      `Use ${workflowId} (${workflowTitle}) as the governing workflow.`,
      "Treat any referenced design system as the source of truth for components, tokens, radius, elevation, surfaces, and theme behavior.",
      "If a design system is present, ask whether it has an accessibility baseline or owner-approved review status before generating UI. If that status is unknown, pause and ask first.",
      "If the brief conflicts with the design system, surface review questions instead of silently overriding the system.",
      "Only when the design system and the brief are both silent, use restrained fallback defaults: approved primitives, a tight 6px radius scale, no decorative gradients, no gratuitous shadows, and both light and dark mode by default.",
      'If the interface includes code blocks, inline viewers, inspectors, or artifact panels, pull guardrail.surface-theme-parity and example.ui-generation.surface-theme-parity-drift so those surfaces stay inside the active theme model instead of defaulting to a dark terminal treatment.',
      "Keep headings, labels, helper text, and CTA copy distinct in role. Collapse near-duplicate UI copy before adding more language.",
      "Keep local controls inside or directly adjacent to the surface they govern. Do not park them in a separate header or metadata zone.",
      `Stay inside ${guardrailIds.join(", ")}.`,
      `Use ${exampleIds.join(", ")} as calibration for what should be rewritten or escalated.`,
      "If the request needs new primitives, unclear accessibility tradeoffs, or unlimited exploration, stop and surface review questions instead of improvising.",
    ].join(" ");
  }

  return [
    `Use ${workflowId || "the selected workflow"} as the governing workflow.`,
    guardrailIds.length
      ? `Stay inside ${guardrailIds.join(", ")}.`
      : "Use the published guardrails that apply to the workflow.",
    exampleIds.length
      ? `Use ${exampleIds.join(", ")} as calibration before acting.`
      : "Use the published examples as calibration before acting.",
    "Escalate when confidence, permissions, or workflow boundaries are unclear.",
  ].join(" ");
}

async function listResources(args: ToolArgs) {
  const index = await readJson<ResourceIndex>("resources", "index.json");
  const type = typeof args.type === "string" ? args.type : undefined;
  const workflowId =
    typeof args.workflow_id === "string" ? args.workflow_id : undefined;
  const guardrailId =
    typeof args.guardrail_id === "string" ? args.guardrail_id : undefined;
  const tag = typeof args.tag === "string" ? args.tag : undefined;

  const resources = index.resources.filter((resource) => {
    if (type && resource.type !== type) {
      return false;
    }
    if (workflowId && !resource.tags.includes(workflowId)) {
      return false;
    }
    if (guardrailId && !resource.tags.includes(guardrailId)) {
      return false;
    }
    if (tag && !resource.tags.includes(tag)) {
      return false;
    }
    return true;
  });

  return responseEnvelope({
    type: "resource_list",
    version: index.version,
    resources,
  });
}

async function getResource(args: ToolArgs) {
  const index = await readJson<ResourceIndex>("resources", "index.json");
  const id = typeof args.id === "string" ? args.id : "";
  const version = typeof args.version === "string" ? args.version : undefined;
  const match = index.resources.find(
    (resource) =>
      resource.id === id && (!version || resource.version === version),
  );

  if (!match) {
    return createError(
      "not_found",
      `Resource ${id} was not found.`,
      "Check resources/index.json or call list_resources first.",
    );
  }

  const resource = await readResourceFromEntry(match);

  return responseEnvelope({
    id: match.id,
    type: match.type,
    version: match.version,
    resource,
  });
}

async function getWorkflowBundle(args: ToolArgs) {
  const workflowId = typeof args.workflow_id === "string" ? args.workflow_id : "";
  const featureIntent = optionalStringValue(args.feature_intent);
  if (!workflowId) {
    return createError(
      "invalid_request",
      "workflow_id is required.",
      "Provide a workflow_id such as workflow.ai-ui-generation.",
    );
  }

  const index = await readJson<ResourceIndex>("resources", "index.json");
  const workflowEntry = index.resources.find(
    (resource) => resource.type === "workflow" && resource.id === workflowId,
  );

  if (!workflowEntry) {
    return createError(
      "not_found",
      `Workflow ${workflowId} was not found.`,
      "Call list_resources with type=workflow to discover valid workflow ids.",
    );
  }

  const workflow = await readResourceFromEntry(workflowEntry);
  const links = isRecord(workflow.links) ? workflow.links : {};
  const guardrailIds = stringArray(workflow.common_guardrails);
  const exampleIds = stringArray(links.example_ids);

  const guardrailEntries = index.resources.filter(
    (resource) =>
      resource.type === "guardrail" && guardrailIds.includes(resource.id),
  );
  const exampleEntries = index.resources.filter(
    (resource) =>
      resource.type === "example" && exampleIds.includes(resource.id),
  );

  const [guardrails, examples] = await Promise.all([
    Promise.all(guardrailEntries.map((entry) => readResourceFromEntry(entry))),
    Promise.all(exampleEntries.map((entry) => readResourceFromEntry(entry))),
  ]);

  return responseEnvelope({
    id: workflowId,
    type: "workflow_bundle",
    version: workflowEntry.version,
    bundle: {
      workflow,
      guardrails,
      examples,
      starter_instructions: createStarterInstructions(
        workflow,
        guardrails,
        examples,
        featureIntent,
      ),
    },
  });
}

async function getPageMarkdown(args: ToolArgs) {
  const slug = typeof args.slug === "string" ? args.slug : "";
  if (!slug.startsWith("/docs/")) {
    return createError(
      "invalid_request",
      "slug must start with /docs/.",
      "Provide the canonical docs slug, for example /docs/start/what-is-judgmentkit.",
    );
  }

  try {
    const relative = `${slug.replace("/docs/", "")}.md`;
    const markdown = await readText("docs", relative);
    return responseEnvelope({
      id: slug,
      type: "doc_markdown",
      version: "1.0.0",
      markdown,
    });
  } catch (error) {
    if (isGeneratedArtifactsMissingError(error)) {
      throw error;
    }

    return createError(
      "not_found",
      `Markdown mirror for ${slug} was not found.`,
      "Verify the docs page exists and that generated mirrors are up to date.",
    );
  }
}

async function getExample(args: ToolArgs) {
  return getResource({
    ...args,
    type: "example",
  });
}

async function resolveRelated(args: ToolArgs) {
  const id = typeof args.id === "string" ? args.id : "";
  const graph = await readJson<GraphNode[]>("graph.json");
  const index = await readJson<ResourceIndex>("resources", "index.json");
  const node = graph.find((entry) => entry.id === id);

  if (!node) {
    return createError(
      "not_found",
      `No related artifacts were found for ${id}.`,
      "Provide a known docs slug or resource id.",
    );
  }

  const relatedIds = new Set(node.related);

  if (node.type === "resource") {
    const entry = index.resources.find((resource) => resource.id === id);
    if (entry) {
      const resource = await readResourceFromEntry(entry);
      for (const relation of extractSemanticRelations(resource)) {
        relatedIds.add(relation);
      }
    }
  }

  const relatedResources = index.resources.filter(
    (resource) =>
      relatedIds.has(resource.id) ||
      relatedIds.has(resource.url.replace(ROOT_URL, "")),
  );

  const relatedDocs = graph.filter(
    (entry) => entry.type === "doc" && relatedIds.has(entry.id),
  );

  return responseEnvelope({
    id,
    type: "related_resources",
    version: "1.0.0",
    related: {
      docs: relatedDocs,
      resources: relatedResources,
    },
  });
}

const PROMPTS: Record<string, PromptDefinition> = {
  explain_guardrail: {
    name: "explain_guardrail",
    description:
      "Explain a guardrail using the published resource, including decision, hard stops, and linked workflows.",
    arguments: ["resource_id"],
    template:
      "Call get_resource for the selected guardrail. Summarize the governed decision, good judgment, non-negotiables, response levels, and linked workflows. Cite the resource id used and do not go beyond the published artifact.",
  },
  apply_guardrail_to_draft: {
    name: "apply_guardrail_to_draft",
    description:
      "Review a draft against a published guardrail and separate issues, rewrite guidance, and escalation signals.",
    arguments: ["resource_id", "draft"],
    template:
      "Call get_resource for the selected guardrail. Review the draft against the published intent, detection logic, and response levels. Return issues found, rewrite guidance, and whether the draft should escalate.",
  },
  summarize_example_incident: {
    name: "summarize_example_incident",
    description:
      "Summarize a published example as scenario, triggered guardrails, response, and lesson.",
    arguments: ["resource_id"],
    template:
      "Call get_example for the selected example. Summarize the scenario, triggered guardrails, verdict, corrected output, and lesson. Keep the lesson tightly grounded in the published artifact.",
  },
  start_design_workflow: {
    name: "start_design_workflow",
    description:
      "Start the AI UI generation workflow with the published JudgmentKit bundle.",
    arguments: ["feature_intent"],
    template: GENERIC_START_DESIGN_WORKFLOW_PROMPT,
  },
  refine_design_first_pass: {
    name: REFINE_DESIGN_FIRST_PASS_PROMPT_NAME,
    description:
      "Critique a first-pass design draft against the published workflow, guardrails, and examples, then prepare a bounded v2 rewrite packet.",
    arguments: [
      "feature_intent",
      "draft",
      "refinement_goal",
      "must_keep",
      "known_issues",
    ],
    template: "",
  },
};

export async function handleToolCall(name: string, args: ToolArgs) {
  try {
    switch (name) {
      case "list_resources":
        return await listResources(args);
      case "get_resource":
        return await getResource(args);
      case "get_workflow_bundle":
        return await getWorkflowBundle(args);
      case "get_page_markdown":
        return await getPageMarkdown(args);
      case "get_example":
        return await getExample(args);
      case "resolve_related":
        return await resolveRelated(args);
      default:
        return createError(
          "invalid_request",
          `Tool ${name} is not supported.`,
          "Call tools/list to discover available tools.",
        );
    }
  } catch (error) {
    if (isGeneratedArtifactsMissingError(error)) {
      return createGeneratedArtifactsMissingResponse(error);
    }

    throw error;
  }
}

export function setPublicDirOverrideForTests(value?: string) {
  publicDirOverride = value;
  generatedArtifactsCheck = undefined;
}

export function listPrompts() {
  return Object.values(PROMPTS);
}

export function getPrompt(name: string, args: ToolArgs = {}) {
  const prompt = PROMPTS[name as keyof typeof PROMPTS];
  if (!prompt) {
    return createError(
      "not_found",
      `Prompt ${name} was not found.`,
      "Call prompts/list to discover available prompts.",
    );
  }

  if (name === REFINE_DESIGN_FIRST_PASS_PROMPT_NAME) {
    const rendered = renderRefineDesignFirstPassPrompt(args);
    if (typeof rendered !== "string") {
      return rendered;
    }

    return {
      ...prompt,
      template: rendered,
    };
  }

  return {
    ...prompt,
    template: renderPromptTemplate(prompt, args),
  };
}

export function listTools() {
  return [
    {
      name: "list_resources",
      description: "Return a filtered list of public resources.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string" },
          workflow_id: { type: "string" },
          guardrail_id: { type: "string" },
          tag: { type: "string" },
          page_type: { type: "string" },
        },
      },
    },
    {
      name: "get_resource",
      description: "Fetch a specific public resource by id and optional version.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          version: { type: "string" },
        },
      },
    },
    {
      name: "get_workflow_bundle",
      description:
        "Fetch a workflow with its linked guardrails, examples, and starter instructions.",
      inputSchema: {
        type: "object",
        required: ["workflow_id"],
        properties: {
          workflow_id: { type: "string" },
          feature_intent: { type: "string" },
        },
      },
    },
    {
      name: "get_page_markdown",
      description: "Fetch the Markdown mirror for a docs page.",
      inputSchema: {
        type: "object",
        required: ["slug"],
        properties: {
          slug: { type: "string" },
        },
      },
    },
    {
      name: "get_example",
      description: "Fetch a structured example resource by id.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
        },
      },
    },
    {
      name: "resolve_related",
      description: "Return related workflows, guardrails, examples, and schemas.",
      inputSchema: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
        },
      },
    },
  ];
}
