import path from "node:path";

export const AI_UI_E2E_WORKFLOW_ID = "workflow.ai-ui-generation";
export const AI_UI_E2E_ARTIFACTS_DIR = path.join(
  process.cwd(),
  "artifacts",
  "ai-ui-e2e-evaluator",
);

export const AI_UI_E2E_FEATURE_INTENT =
  "Design an AI UI workspace for JudgmentKit that helps product designers get a strong first-pass interface with minimal cleanup. The UI should support prompting, workflow guidance, guardrail awareness, result review, and implementation handoff.";

export const AI_UI_E2E_SHARED_PROMPT =
  "Design the first-pass AI UI workspace for JudgmentKit. Prioritize fast onboarding, clear information hierarchy, explicit next steps, restrained visual decisions, accessible semantics, and complete light/dark theme behavior. Include the core screens, major regions, key components, primary actions, and concise UX rationale for why this should produce a great result in one shot and reduce cleanup work.";

export const AI_UI_E2E_COMMON_OUTPUT_CONTRACT_SECTIONS = [
  "core_screens",
  "component_recipes",
  "screen_composition",
  "state_coverage",
  "theme_contract",
  "accessibility_contract",
  "escalation_items",
] as const;

export const AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS = [
  "core_screens",
  "token_spec",
  "component_recipes",
  "screen_composition",
  "state_coverage",
  "theme_contract",
  "accessibility_contract",
  "escalation_items",
] as const;

export const AI_UI_E2E_DESIGN_SYSTEM_OUTPUT_CONTRACT_SECTIONS = [
  "core_screens",
  "design_system_bindings",
  "component_recipes",
  "screen_composition",
  "state_coverage",
  "theme_contract",
  "accessibility_contract",
  "escalation_items",
] as const;

export const AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT = [
  "No external design system is present for this run.",
  "JudgmentKit's portable no-design-system authority pack is the source of truth.",
  "Use the published primitive inventory, token contract, reusable React+Tailwind recipes, layout archetypes, vendored guideline profiles, state matrix, and handoff contract instead of fallback adjectives or bespoke primitives.",
  `For no-design-system output, include exactly these sections: ${AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS.join(", ")}.`,
].join("\n");

export const AI_UI_E2E_SHADCN_RADIX_CONTEXT = [
  "Shadcn/ui plus Radix UI is the authoritative component system for this run.",
  "The accessibility baseline is considered reviewed and approved for test purposes.",
  "Use Shadcn/ui component patterns, Radix primitives, CSS-variable tokens, and composition discipline as the source of truth.",
  "Do not invent a parallel primitive layer unless the workflow explicitly escalates it.",
  `For design-system output, include exactly these sections: ${AI_UI_E2E_DESIGN_SYSTEM_OUTPUT_CONTRACT_SECTIONS.join(", ")}.`,
].join("\n");

export const AI_UI_E2E_ACCEPTANCE_CRITERIA = [
  "First-shot usefulness",
  "Cleanup load",
  "Workflow adherence",
  "Design-system integrity",
  "Theme completeness",
  "UX clarity",
  "Output discipline",
  "Handoff quality",
] as const;

export type AiUiE2eAcceptanceCriterion =
  (typeof AI_UI_E2E_ACCEPTANCE_CRITERIA)[number];

export type AiUiE2ePathId =
  | "path-1-no-design-system"
  | "path-2-shadcn-radix";

export type AiUiE2ePath = {
  id: AiUiE2ePathId;
  title: string;
  systemContext: string;
  expectedBehavior: string[];
};

export const AI_UI_E2E_PATHS: readonly AiUiE2ePath[] = [
  {
    id: "path-1-no-design-system",
    title: "Path 1: JudgmentKit portable authority without an external design system",
    systemContext: AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT,
    expectedBehavior: [
      "Uses the JudgmentKit portable no-design-system authority pack as the source of truth",
      "Maps the UI to published primitives, tokens, archetypes, recipes, and required states",
      `Returns ${AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS.join(", ")}`,
      "Keeps artifact, code, and inspector surfaces theme-consistent",
      "Produces a compact, implementation-ready first pass rather than exploratory sprawl",
      "Proves reusable component composition instead of only describing screens",
    ],
  },
  {
    id: "path-2-shadcn-radix",
    title: "Path 2: One-shot with Shadcn+Radix",
    systemContext: AI_UI_E2E_SHADCN_RADIX_CONTEXT,
    expectedBehavior: [
      "Honors Shadcn/ui plus Radix as authoritative",
      "Maps the UI to existing Shadcn component patterns and Radix primitives with code-level composition evidence",
      "Uses CSS-variable token discipline and theme parity instead of ad hoc styling",
      "Stays restrained in the zero-shot pass",
      "Surfaces escalation only if the requested UI truly falls outside the system",
    ],
  },
];

export function getAiUiE2ePaths(): AiUiE2ePath[] {
  return AI_UI_E2E_PATHS.map((testPath) => ({
    ...testPath,
    expectedBehavior: [...testPath.expectedBehavior],
  }));
}

export function getDefaultAiUiE2eArtifactsDir() {
  return AI_UI_E2E_ARTIFACTS_DIR;
}

export function createCodexSeedPrompt(path: AiUiE2ePath) {
  const starterPromptName =
    path.id === "path-1-no-design-system"
      ? "start_no_design_system_workflow"
      : "start_design_workflow";
  const sections = [
    `Feature intent: ${AI_UI_E2E_FEATURE_INTENT}`,
    "Required MCP call order:",
    "1. Verify the local judgmentkit MCP server with tools/list.",
    `2. Call ${starterPromptName} with the feature intent above.`,
    `3. Call get_workflow_bundle({ workflow_id: "${AI_UI_E2E_WORKFLOW_ID}", feature_intent: ${JSON.stringify(
      AI_UI_E2E_FEATURE_INTENT,
    )} }).`,
  ];

  if (path.systemContext) {
    sections.push("Design-system context:", path.systemContext);
  }

  sections.push(
    "User prompt:",
    AI_UI_E2E_SHARED_PROMPT,
    "Output requirements:",
    "- Provide the core screens, major regions, key components, primary actions, and concise UX rationale.",
    "- Prove reusable component composition with concrete React+Tailwind recipe snippets, slot structure, allowed variants, interaction rules, and accessibility contract details.",
    "- Keep the first pass bounded and implementation-ready.",
    "- Treat JudgmentKit workflow guidance and linked guardrails as authoritative.",
    path.id === "path-1-no-design-system"
      ? `- For this path, treat the portable JudgmentKit no-design-system authority pack as the source of truth and include ${AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS.join(", ")}.`
      : `- For this path, treat the external design-system context as the source of truth and include ${AI_UI_E2E_DESIGN_SYSTEM_OUTPUT_CONTRACT_SECTIONS.join(", ")}.`,
    "Artifact requirements:",
    "- Save the full conversation transcript separately as `transcript.md`.",
    "- Save only the final textual answer separately as `response.md`.",
    "- Save a machine-readable `implementation-contract.json` that matches the response sections, component recipes, states, and theme bindings.",
    "- Save a `preview-source.tsx` renderer that derives preview HTML from the implementation contract.",
    "- Let the evaluator generate `preview.html` from `preview-source.tsx` during visual capture instead of hand-authoring preview HTML.",
  );

  return sections.join("\n\n");
}

export function createEvidenceTemplate(outputDir: string) {
  const pathSections = getAiUiE2ePaths()
    .map((path) => {
      const criteriaRows = AI_UI_E2E_ACCEPTANCE_CRITERIA.map(
        (criterion) => `| ${criterion} |  |  |`,
      ).join("\n");

      const expectedBehavior = path.expectedBehavior
        .map((item) => `- ${item}`)
        .join("\n");

      const systemContext = path.systemContext
        ? path.systemContext
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")
        : "- None";

      return [
        `## ${path.title}`,
        "",
        `Artifacts: \`${outputDir}/${path.id}\``,
        "",
        "### Controlled inputs",
        `- Feature intent: ${AI_UI_E2E_FEATURE_INTENT}`,
        `- Shared prompt: ${AI_UI_E2E_SHARED_PROMPT}`,
        "- System context:",
        systemContext,
        "",
        "### Expected behavior",
        expectedBehavior,
        "",
        "### Run evidence",
        "- Codex transcript: ",
        "- MCP calls made and their order: ",
        "- Final generated UI response: ",
        "- implementation-contract.json saved: ",
        "- preview-source.tsx saved: ",
        "- Generated preview.html saved: ",
        "- Desktop light screenshot saved: ",
        "- Desktop dark screenshot saved: ",
        "- Pass / warn / fail verdict: ",
        "",
        "### Scorecard",
        "| Criterion | Score (1-5) | Notes |",
        "| --- | --- | --- |",
        criteriaRows,
        "",
        "### Cleanup notes",
        "- What reduced cleanup:",
        "- What still created cleanup:",
        "- Did JudgmentKit materially improve the result vs an unguided prompt:",
        "",
      ].join("\n");
    })
    .join("\n");

  return [
    "# JudgmentKit AI UI Workflow E2E Report",
    "",
    `Generated evidence bundle: \`${outputDir}\``,
    "",
    "## Shared MCP verification",
    "- tools/list reachable: ",
    "- start_design_workflow reachable: ",
    `- get_workflow_bundle reachable: `,
    `- Workflow bundle used: \`${AI_UI_E2E_WORKFLOW_ID}\``,
    "",
    pathSections,
  ].join("\n");
}
