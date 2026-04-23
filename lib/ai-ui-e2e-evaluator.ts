import crypto from "node:crypto";
import path from "node:path";

import {
  AI_UI_E2E_ACCEPTANCE_CRITERIA,
  AI_UI_E2E_DESIGN_SYSTEM_OUTPUT_CONTRACT_SECTIONS,
  AI_UI_E2E_FEATURE_INTENT,
  AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS,
  AI_UI_E2E_SHARED_PROMPT,
  AI_UI_E2E_WORKFLOW_ID,
  type AiUiE2eAcceptanceCriterion,
  type AiUiE2ePath,
  getAiUiE2ePaths,
} from "@/lib/ai-ui-e2e";

export const AI_UI_E2E_EVALUATOR_STATUSES = ["pass", "warn", "fail"] as const;
export const AI_UI_E2E_EVALUATOR_ACTIONS = [
  "allow",
  "rewrite",
  "review",
  "block",
  "escalate",
] as const;
export const AI_UI_E2E_EVALUATOR_SEVERITIES = [
  "low",
  "medium",
  "high",
] as const;
export type AiUiE2eEvaluatorWinner = AiUiE2ePath["id"] | "tie";

export const AI_UI_E2E_EVALUATOR_WINNERS: readonly AiUiE2eEvaluatorWinner[] = [
  ...getAiUiE2ePaths().map((testPath) => testPath.id),
  "tie",
] as const;
export const AI_UI_E2E_VISUAL_COLOR_SCHEMES = ["light", "dark"] as const;
export const AI_UI_E2E_VISUAL_VIEWPORT = {
  width: 1440,
  height: 960,
  deviceScaleFactor: 2,
} as const;
export const AI_UI_E2E_GENERATED_PREVIEW_MARKER_PREFIX =
  "judgmentkit-ai-ui-e2e-generated-preview";

export type AiUiE2eEvaluatorStatus =
  (typeof AI_UI_E2E_EVALUATOR_STATUSES)[number];
export type AiUiE2eEvaluatorAction =
  (typeof AI_UI_E2E_EVALUATOR_ACTIONS)[number];
export type AiUiE2eEvaluatorSeverity =
  (typeof AI_UI_E2E_EVALUATOR_SEVERITIES)[number];
export type AiUiE2eVisualColorScheme =
  (typeof AI_UI_E2E_VISUAL_COLOR_SCHEMES)[number];

export type AiUiE2eCriterionScore = {
  criterion: AiUiE2eAcceptanceCriterion;
  score: 1 | 2 | 3 | 4 | 5;
  notes: string;
  evidence: string[];
};

export type AiUiE2eImplementationContract = {
  version: "1.0.0";
  kind: "ai_ui_e2e_implementation_contract";
  path_id: AiUiE2ePath["id"];
  authority_model: "portable_no_design_system" | "shadcn_radix";
  required_sections: string[];
  response_alignment: {
    component_recipe_ids: string[];
    state_ids: string[];
    theme_bindings: string[];
  };
  token_spec?: {
    bindings: string[];
  };
  design_system_bindings?: string[];
  component_recipes: Array<{
    recipe_id: string;
    title: string;
    primitive_id: string;
    source_of_truth: string;
    slots: string[];
    allowed_variants: string[];
    interaction_rules: string[];
    accessibility_contract: string[];
    react_tailwind: string;
  }>;
  screen_composition: Array<{
    screen_id: string;
    title: string;
    recipe_ids: string[];
    primary_actions: string[];
    notes: string[];
  }>;
  state_coverage: Array<{
    state: string;
    applies_to: string[];
    behavior: string[];
  }>;
  theme_contract: {
    bindings: string[];
    parity_rules: string[];
  };
  accessibility_contract: {
    global_rules: string[];
    focus_rules: string[];
    keyboard_rules: string[];
    motion_rules: string[];
  };
  escalation_items: string[];
};

export type AiUiE2ePathJudgeInput = {
  version: "1.0.0";
  kind: "ai_ui_e2e_path_judge_input";
  path: AiUiE2ePath;
  workflow_id: string;
  feature_intent: string;
  shared_prompt: string;
  rubric: {
    scoring_scale: "1-5";
    criteria: typeof AI_UI_E2E_ACCEPTANCE_CRITERIA;
    pass_rule: string[];
  };
  mcp_verification: {
    call_order_ref: string;
    tools_list_ref: string;
    prompts_list_ref: string;
    workflow_bundle_ref: string;
    start_design_workflow_ref: string;
    start_no_design_system_workflow_ref: string;
  };
  evidence_refs: {
    transcript_ref: string;
    response_ref: string;
    metadata_ref: string;
    implementation_contract_ref: string;
    preview_source_ref: string;
    preview_ref: string;
  };
  judging_instructions: string[];
};

export type AiUiE2ePathScore = {
  version: "1.0.0";
  kind: "ai_ui_e2e_path_score";
  path_id: AiUiE2ePath["id"];
  completed: boolean;
  verdict: {
    verdict_id: string;
    decision_id: string;
    evaluated_at: string;
    status: AiUiE2eEvaluatorStatus;
    severity: AiUiE2eEvaluatorSeverity;
    guardrails_triggered: string[];
    reasons: string[];
    recommended_action: AiUiE2eEvaluatorAction;
    drift_score?: number;
    rewrite_hint?: string;
    ownership?: {
      decision_owner?: string;
      risk_owner?: string;
      operational_owner?: string;
    };
    incident_required?: boolean;
  };
  criteria: AiUiE2eCriterionScore[];
  strongest_evidence: string[];
  cleanup_notes: {
    reduced_cleanup: string;
    remaining_cleanup: string;
    judgmentkit_impact: string;
  };
  rationale: string;
};

export type AiUiE2eVisualManifest = {
  version: "1.0.0";
  kind: "ai_ui_e2e_visual_manifest";
  path_id: AiUiE2ePath["id"];
  completed: boolean;
  preview_ref: string;
  component_evidence: {
    implementation_contract_ref: string;
    preview_source_ref: string;
  };
  derivation: {
    generated_from_contract: true;
    marker_prefix: string;
    source_renderer: "preview-source.tsx";
  };
  screenshots: {
    desktop_light_ref: string;
    desktop_dark_ref: string;
  };
  capture: {
    browser: "chromium";
    headless: true;
    viewport: {
      width: number;
      height: number;
      deviceScaleFactor: number;
    };
    color_schemes: AiUiE2eVisualColorScheme[];
  };
  captured_at: string;
};

export type AiUiE2eComparisonInput = {
  version: "1.0.0";
  kind: "ai_ui_e2e_comparison_judge_input";
  workflow_id: string;
  feature_intent: string;
  shared_prompt: string;
  controlled_variable: string;
  path_inputs: {
    path_id: AiUiE2ePath["id"];
    judge_input_ref: string;
    transcript_ref: string;
    response_ref: string;
    implementation_contract_ref: string;
    preview_source_ref: string;
  }[];
  judging_instructions: string[];
};

export type AiUiE2eComparisonResult = {
  version: "1.0.0";
  kind: "ai_ui_e2e_comparison";
  completed: boolean;
  winner: AiUiE2eEvaluatorWinner;
  confidence: number;
  meaningful_difference: boolean;
  recommended_next_action: AiUiE2eEvaluatorAction;
  rationale: string;
  criteria_deltas: Array<{
    criterion: AiUiE2eAcceptanceCriterion;
    winner: AiUiE2eEvaluatorWinner;
    delta: number;
    notes: string;
  }>;
  strongest_evidence: Record<AiUiE2ePath["id"], string[]>;
  top_cleanup_risks: string[];
  judgmentkit_impact_summary: string;
};

export type AiUiE2eMergedSummary = {
  workflow_id: string;
  path_results: AiUiE2ePathScore[];
  path_visuals: AiUiE2eVisualManifest[];
  comparison: AiUiE2eComparisonResult;
  shared_mcp_verification: {
    tools_list_ref: string;
    prompts_list_ref: string;
    workflow_bundle_ref: string;
    call_order_ref: string;
  };
};

export type AiUiE2eExternalJudgePacketInput = {
  output_directory: string;
  judge_prompt: string;
  comparison_input: AiUiE2eComparisonInput;
  comparison_template: AiUiE2eComparisonResult;
  shared_artifacts: {
    mcp_call_order: unknown;
    tools_list: unknown;
    prompts_list: unknown;
    start_design_workflow: string;
    start_no_design_system_workflow: string;
    workflow_bundle: unknown;
  };
  path_packets: Array<{
    path: AiUiE2ePath;
    judge_input: AiUiE2ePathJudgeInput;
    transcript: string;
    response: string;
    implementation_contract: AiUiE2eImplementationContract;
    preview_source: string;
    path_score_template: AiUiE2ePathScore;
  }>;
};

export function createPathJudgeInput(
  outputDirectory: string,
  testPath: AiUiE2ePath,
): AiUiE2ePathJudgeInput {
  const baseRef = path.join(outputDirectory, testPath.id);

  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_path_judge_input",
    path: testPath,
    workflow_id: AI_UI_E2E_WORKFLOW_ID,
    feature_intent: AI_UI_E2E_FEATURE_INTENT,
    shared_prompt: AI_UI_E2E_SHARED_PROMPT,
    rubric: {
      scoring_scale: "1-5",
      criteria: AI_UI_E2E_ACCEPTANCE_CRITERIA,
      pass_rule: [
        "The MCP workflow must be successfully invoked end to end.",
        "The output must be usable as a first pass without major structural rewrite.",
        "The output must prove reusable component composition through implementation-contract.json and preview-source.tsx, not only prose naming.",
        "There must be no major guardrail drift in design-system integrity, spec completeness, theme parity, or ornamental zero-shot styling.",
      ],
    },
    mcp_verification: {
      call_order_ref: path.join(outputDirectory, "mcp-call-order.json"),
      tools_list_ref: path.join(outputDirectory, "tools-list.json"),
      prompts_list_ref: path.join(outputDirectory, "prompts-list.json"),
      workflow_bundle_ref: path.join(outputDirectory, "workflow-bundle.json"),
      start_design_workflow_ref: path.join(outputDirectory, "start-design-workflow.txt"),
      start_no_design_system_workflow_ref: path.join(
        outputDirectory,
        "start-no-design-system-workflow.txt",
      ),
    },
    evidence_refs: {
      transcript_ref: path.join(baseRef, "transcript.md"),
      response_ref: path.join(baseRef, "response.md"),
      metadata_ref: path.join(baseRef, "metadata.json"),
      implementation_contract_ref: path.join(baseRef, "implementation-contract.json"),
      preview_source_ref: path.join(baseRef, "preview-source.tsx"),
      preview_ref: path.join(baseRef, "preview.html"),
    },
    judging_instructions: [
      "Judge this path independently before comparing it to the other path.",
      "Cite concrete evidence from the transcript and final response.",
      "Use implementation-contract.json and preview-source.tsx as the proof of real component composition evidence.",
      "Do not reward ornamental novelty over first-pass usefulness or cleanup reduction.",
      "Treat JudgmentKit workflow guidance, linked guardrails, and any linked constraint packs as authoritative.",
      "Score every criterion on a 1-5 scale and explain meaningful deductions.",
    ],
  };
}

export function createComparisonJudgeInput(
  outputDirectory: string,
  paths: AiUiE2ePath[],
): AiUiE2eComparisonInput {
  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_comparison_judge_input",
    workflow_id: AI_UI_E2E_WORKFLOW_ID,
    feature_intent: AI_UI_E2E_FEATURE_INTENT,
    shared_prompt: AI_UI_E2E_SHARED_PROMPT,
    controlled_variable:
      "Both paths use the exact same prompt text. Only the path-level system context changes.",
    path_inputs: paths.map((testPath) => ({
      path_id: testPath.id,
      judge_input_ref: path.join(outputDirectory, testPath.id, "judge-input.json"),
      transcript_ref: path.join(outputDirectory, testPath.id, "transcript.md"),
      response_ref: path.join(outputDirectory, testPath.id, "response.md"),
      implementation_contract_ref: path.join(
        outputDirectory,
        testPath.id,
        "implementation-contract.json",
      ),
      preview_source_ref: path.join(outputDirectory, testPath.id, "preview-source.tsx"),
    })),
    judging_instructions: [
      "Score each path independently first, then compare them side by side.",
      "Compare only on the controlled variable, not on unrelated stylistic preference.",
      "Prefer outputs that reduce cleanup and preserve first-pass product-design usefulness.",
      "Use implementation-contract.json and preview-source.tsx as component-evidence proofs, not just prose response labels.",
      "Call out when the path-level authority context helps or hurts the result meaningfully.",
      "Name a winner only when the difference is supported by concrete evidence.",
    ],
  };
}

export function createJudgePrompt(outputDirectory: string) {
  const pathPacketLines = getAiUiE2ePaths().map(
    (testPath, index) =>
      `- Path ${index + 1} packet: \`${path.join(outputDirectory, testPath.id, "judge-input.json")}\``,
  );

  return [
    "# JudgmentKit AI UI E2E Judge Prompt",
    "",
    "You are evaluating two AI UI generation runs for JudgmentKit.",
    "",
    "## Inputs",
    `- Shared comparison packet: \`${path.join(outputDirectory, "judge-comparison-input.json")}\``,
    ...pathPacketLines,
    "",
    "## Required workflow",
    "1. Read both path judge packets and their referenced transcript and response files.",
    "2. Read implementation-contract.json and preview-source.tsx for each path as the proof of real component composition evidence.",
    "3. Produce `path-score.json` for each path using the local harness contract.",
    "4. Produce `comparison.json` using the local harness contract.",
    "5. Cite concrete evidence from the transcript, final response text, and component-evidence artifacts.",
    "",
    "## Judging guidance",
    "- Score every acceptance criterion on a 1-5 scale.",
    "- Use only `pass`, `warn`, or `fail` for verdict status.",
    "- Use only `allow`, `rewrite`, `review`, `block`, or `escalate` for recommended action.",
    "- Avoid rewarding ornamental novelty over first-pass usefulness and cleanup reduction.",
    "- Treat the JudgmentKit workflow bundle, guardrails, and linked constraint packs as authoritative.",
    "- Treat implementation-contract.json and preview-source.tsx as the primary proof that components were actually composed rather than merely named.",
    "- When comparing the two paths, compare only on the controlled variable: path-level authority context.",
  ].join("\n");
}

export function hasPlaceholderEvidence(content: string) {
  return (
    content.includes("Paste the exact Codex transcript for this run here.") ||
    content.includes("Paste the final generated UI response here.")
  );
}

export function hasPlaceholderPreview(content: string) {
  return content.includes(
    "Replace this placeholder with a self-contained HTML preview for this path.",
  );
}

export function hasPlaceholderImplementationContract(content: string) {
  return (
    content.includes("replace-with-real-recipe-id") ||
    content.includes("Replace with a real component recipe") ||
    content.includes("Replace this placeholder with real")
  );
}

export function hasPlaceholderPreviewSource(content: string) {
  return content.includes(
    "Replace this placeholder with a preview-source renderer for this path.",
  );
}

export function createGeneratedPreviewMarker(
  pathId: AiUiE2ePath["id"],
  implementationContractContent: string,
  previewSourceContent: string,
) {
  const contractHash = crypto
    .createHash("sha256")
    .update(implementationContractContent)
    .digest("hex")
    .slice(0, 16);
  const sourceHash = crypto
    .createHash("sha256")
    .update(previewSourceContent)
    .digest("hex")
    .slice(0, 16);

  return `${AI_UI_E2E_GENERATED_PREVIEW_MARKER_PREFIX}:${pathId}:${contractHash}:${sourceHash}`;
}

export function isGeneratedPreview(content: string) {
  return content.includes(AI_UI_E2E_GENERATED_PREVIEW_MARKER_PREFIX);
}

export function collectImplementationContractAlignmentErrors(
  contract: AiUiE2eImplementationContract,
  response: string,
) {
  const errors: string[] = [];
  const normalizedResponse = response.toLowerCase();

  for (const section of contract.required_sections) {
    if (!normalizedResponse.includes(section.toLowerCase())) {
      errors.push(`response missing required section ${section}`);
    }
  }

  for (const recipeId of contract.response_alignment.component_recipe_ids) {
    if (recipeId && !normalizedResponse.includes(recipeId.toLowerCase())) {
      errors.push(`response missing component recipe evidence for ${recipeId}`);
    }
  }

  for (const stateId of contract.response_alignment.state_ids) {
    if (stateId && !normalizedResponse.includes(stateId.toLowerCase())) {
      errors.push(`response missing state coverage for ${stateId}`);
    }
  }

  for (const binding of contract.response_alignment.theme_bindings) {
    if (binding && !response.includes(binding)) {
      errors.push(`response missing theme binding ${binding}`);
    }
  }

  return errors;
}

export function createPathScoreTemplate(
  testPath: AiUiE2ePath,
): AiUiE2ePathScore {
  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_path_score",
    path_id: testPath.id,
    completed: false,
    verdict: {
      verdict_id: "",
      decision_id: "",
      evaluated_at: "",
      status: "warn",
      severity: "medium",
      guardrails_triggered: [],
      reasons: [],
      recommended_action: "review",
      ownership: {
        decision_owner: "Design Systems",
        risk_owner: "Accessibility",
        operational_owner: "Frontend Platform",
      },
      incident_required: false,
    },
    criteria: AI_UI_E2E_ACCEPTANCE_CRITERIA.map((criterion) => ({
      criterion,
      score: 3,
      notes: "",
      evidence: [],
    })),
    strongest_evidence: [],
    cleanup_notes: {
      reduced_cleanup: "",
      remaining_cleanup: "",
      judgmentkit_impact: "",
    },
    rationale: "",
  };
}

export function createComparisonTemplate(): AiUiE2eComparisonResult {
  const strongestEvidence = {} as Record<AiUiE2ePath["id"], string[]>;
  for (const testPath of getAiUiE2ePaths()) {
    strongestEvidence[testPath.id] = [];
  }

  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_comparison",
    completed: false,
    winner: "tie",
    confidence: 0,
    meaningful_difference: false,
    recommended_next_action: "review",
    rationale: "",
    criteria_deltas: AI_UI_E2E_ACCEPTANCE_CRITERIA.map((criterion) => ({
      criterion,
      winner: "tie",
      delta: 0,
      notes: "",
    })),
    strongest_evidence: strongestEvidence,
    top_cleanup_risks: [],
    judgmentkit_impact_summary: "",
  };
}

export function createImplementationContractTemplate(
  testPath: AiUiE2ePath,
): AiUiE2eImplementationContract {
  const requiredSections =
    testPath.id === "path-1-no-design-system"
      ? [...AI_UI_E2E_PORTABLE_OUTPUT_CONTRACT_SECTIONS]
      : [...AI_UI_E2E_DESIGN_SYSTEM_OUTPUT_CONTRACT_SECTIONS];

  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_implementation_contract",
    path_id: testPath.id,
    authority_model:
      testPath.id === "path-1-no-design-system"
        ? "portable_no_design_system"
        : "shadcn_radix",
    required_sections: requiredSections,
    response_alignment: {
      component_recipe_ids: ["replace-with-real-recipe-id"],
      state_ids: ["loading", "empty", "ready", "error", "review-needed", "disabled"],
      theme_bindings:
        testPath.id === "path-1-no-design-system"
          ? ["--jk-color-canvas", "--jk-color-surface", "--jk-color-accent"]
          : ["--background", "--card", "--primary"],
    },
    token_spec:
      testPath.id === "path-1-no-design-system"
        ? {
            bindings: ["--jk-color-canvas", "--jk-color-surface", "--jk-color-accent"],
          }
        : undefined,
    design_system_bindings:
      testPath.id === "path-2-shadcn-radix"
        ? ["Sidebar", "Card", "Tabs", "Sheet", "Dialog", "Table"]
        : undefined,
    component_recipes: [
      {
        recipe_id: "replace-with-real-recipe-id",
        title: "Replace with a real component recipe",
        primitive_id: "card",
        source_of_truth:
          testPath.id === "path-1-no-design-system"
            ? "constraint-pack.ai-ui-no-design-system"
            : "shadcn-radix",
        slots: ["header", "body"],
        allowed_variants: ["default"],
        interaction_rules: ["Replace this placeholder with real interaction rules."],
        accessibility_contract: [
          "Replace this placeholder with label, focus, keyboard, and semantics rules.",
        ],
        react_tailwind:
          "// Replace this placeholder with a real React+Tailwind recipe snippet.",
      },
    ],
    screen_composition: [
      {
        screen_id: "replace-with-real-screen-id",
        title: "Replace with a real screen composition",
        recipe_ids: ["replace-with-real-recipe-id"],
        primary_actions: ["Replace with a real primary action"],
        notes: ["Replace this placeholder with real composition notes."],
      },
    ],
    state_coverage: [
      {
        state: "loading",
        applies_to: ["replace-with-real-screen-id"],
        behavior: ["Replace this placeholder with real loading behavior."],
      },
    ],
    theme_contract: {
      bindings:
        testPath.id === "path-1-no-design-system"
          ? ["--jk-color-canvas", "--jk-color-surface", "--jk-color-accent"]
          : ["--background", "--card", "--primary"],
      parity_rules: [
        "Replace this placeholder with explicit light and dark parity rules.",
      ],
    },
    accessibility_contract: {
      global_rules: ["Replace this placeholder with global accessibility rules."],
      focus_rules: ["Replace this placeholder with focus-visible rules."],
      keyboard_rules: ["Replace this placeholder with keyboard behavior rules."],
      motion_rules: ["Replace this placeholder with reduced-motion behavior rules."],
    },
    escalation_items: ["Replace this placeholder with real escalation items."],
  };
}

export function createPreviewSourceTemplate(testPath: AiUiE2ePath) {
  return [
    "const PLACEHOLDER_NOTICE = \"Replace this placeholder with a preview-source renderer for this path.\";",
    "",
    "export default function renderPreview({ contract }) {",
    "  const title = contract?.path_id ?? \"preview\";",
    "  return [",
    "    '<!doctype html>',",
    "    '<html lang=\"en\">',",
    "    '  <head>',",
    "    '    <meta charset=\"utf-8\" />',",
    "    '    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />',",
    `    ${JSON.stringify(`    <title>${testPath.title} Preview</title>`)},`,
    "    '    <style>body{font-family:ui-sans-serif,system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;padding:48px;background:#fff;color:#111}main{max-width:48rem;border:1px dashed currentColor;padding:32px;border-radius:16px}</style>',",
    "    '  </head>',",
    "    '  <body>',",
    "    '    <main>',",
    "    `      <h1>${title}</h1>`,",
    "    '      <p>' + PLACEHOLDER_NOTICE + '</p>',",
    "    '    </main>',",
    "    '  </body>',",
    "    '</html>',",
    "  ].join('\\n');",
    "}",
    "",
  ].join("\n");
}

export function createVisualManifestTemplate(
  outputDirectory: string,
  testPath: AiUiE2ePath,
): AiUiE2eVisualManifest {
  const baseRef = path.join(outputDirectory, testPath.id);

  return {
    version: "1.0.0",
    kind: "ai_ui_e2e_visual_manifest",
    path_id: testPath.id,
    completed: false,
    preview_ref: path.join(baseRef, "preview.html"),
    component_evidence: {
      implementation_contract_ref: path.join(baseRef, "implementation-contract.json"),
      preview_source_ref: path.join(baseRef, "preview-source.tsx"),
    },
    derivation: {
      generated_from_contract: true,
      marker_prefix: AI_UI_E2E_GENERATED_PREVIEW_MARKER_PREFIX,
      source_renderer: "preview-source.tsx",
    },
    screenshots: {
      desktop_light_ref: path.join(baseRef, "screenshots", "desktop-light.png"),
      desktop_dark_ref: path.join(baseRef, "screenshots", "desktop-dark.png"),
    },
    capture: {
      browser: "chromium",
      headless: true,
      viewport: {
        width: AI_UI_E2E_VISUAL_VIEWPORT.width,
        height: AI_UI_E2E_VISUAL_VIEWPORT.height,
        deviceScaleFactor: AI_UI_E2E_VISUAL_VIEWPORT.deviceScaleFactor,
      },
      color_schemes: [...AI_UI_E2E_VISUAL_COLOR_SCHEMES],
    },
    captured_at: "",
  };
}

export function assertCompletedPathScore(score: AiUiE2ePathScore) {
  if (!score.completed) {
    throw new Error(`Path score for ${score.path_id} is not marked complete.`);
  }

  if (!AI_UI_E2E_EVALUATOR_STATUSES.includes(score.verdict.status)) {
    throw new Error(`Invalid verdict status for ${score.path_id}.`);
  }

  if (score.criteria.length !== AI_UI_E2E_ACCEPTANCE_CRITERIA.length) {
    throw new Error(`Path score for ${score.path_id} is missing criterion scores.`);
  }
}

export function assertCompletedComparison(result: AiUiE2eComparisonResult) {
  if (!result.completed) {
    throw new Error("Comparison result is not marked complete.");
  }

  if (!AI_UI_E2E_EVALUATOR_WINNERS.includes(result.winner)) {
    throw new Error("Comparison result has an invalid winner.");
  }

  if (result.criteria_deltas.length !== AI_UI_E2E_ACCEPTANCE_CRITERIA.length) {
    throw new Error("Comparison result is missing criterion deltas.");
  }
}

export function assertCompletedVisualManifest(manifest: AiUiE2eVisualManifest) {
  if (!manifest.completed) {
    throw new Error(`Visual manifest for ${manifest.path_id} is not marked complete.`);
  }

  if (manifest.kind !== "ai_ui_e2e_visual_manifest") {
    throw new Error(`Visual manifest for ${manifest.path_id} has an invalid kind.`);
  }

  if (manifest.capture.browser !== "chromium") {
    throw new Error(`Visual manifest for ${manifest.path_id} must use chromium.`);
  }

  if (!manifest.capture.headless) {
    throw new Error(`Visual manifest for ${manifest.path_id} must be headless.`);
  }

  if (!manifest.derivation.generated_from_contract) {
    throw new Error(
      `Visual manifest for ${manifest.path_id} must be generated from contract evidence.`,
    );
  }

  if (
    manifest.derivation.marker_prefix !== AI_UI_E2E_GENERATED_PREVIEW_MARKER_PREFIX
  ) {
    throw new Error(
      `Visual manifest for ${manifest.path_id} has an invalid preview marker prefix.`,
    );
  }

  const colorSchemes = manifest.capture.color_schemes.join(",");
  if (colorSchemes !== AI_UI_E2E_VISUAL_COLOR_SCHEMES.join(",")) {
    throw new Error(
      `Visual manifest for ${manifest.path_id} must include light and dark captures.`,
    );
  }
}

export function createMergedSummary(
  pathResults: AiUiE2ePathScore[],
  pathVisuals: AiUiE2eVisualManifest[],
  comparison: AiUiE2eComparisonResult,
  outputDirectory: string,
): AiUiE2eMergedSummary {
  return {
    workflow_id: AI_UI_E2E_WORKFLOW_ID,
    path_results: pathResults,
    path_visuals: pathVisuals,
    comparison,
    shared_mcp_verification: {
      tools_list_ref: path.join(outputDirectory, "tools-list.json"),
      prompts_list_ref: path.join(outputDirectory, "prompts-list.json"),
      workflow_bundle_ref: path.join(outputDirectory, "workflow-bundle.json"),
      call_order_ref: path.join(outputDirectory, "mcp-call-order.json"),
    },
  };
}

export function createFinalComparisonSummaryMarkdown(
  mergedSummary: AiUiE2eMergedSummary,
) {
  const standardPaths = getAiUiE2ePaths();
  const [pathOne, pathTwo] = standardPaths;
  const scoreTableRows = AI_UI_E2E_ACCEPTANCE_CRITERIA.map((criterion) => {
    const pathOneResult = mergedSummary.path_results.find(
      (result) => result.path_id === pathOne?.id,
    );
    const pathTwoResult = mergedSummary.path_results.find(
      (result) => result.path_id === pathTwo?.id,
    );
    const pathOneScore = pathOneResult?.criteria.find(
      (entry) => entry.criterion === criterion,
    )?.score;
    const pathTwoScore = pathTwoResult?.criteria.find(
      (entry) => entry.criterion === criterion,
    )?.score;
    const delta = mergedSummary.comparison.criteria_deltas.find(
      (entry) => entry.criterion === criterion,
    );

    return `| ${criterion} | ${pathOneScore ?? ""} | ${pathTwoScore ?? ""} | ${
      delta?.winner ?? ""
    } | ${delta?.notes ?? ""} |`;
  }).join("\n");

  const pathSections = mergedSummary.path_results
    .map((result) => {
      const testPath = standardPaths.find((entry) => entry.id === result.path_id);
      const evidence = result.strongest_evidence
        .map((item) => `- ${item}`)
        .join("\n");
      const visuals = mergedSummary.path_visuals.find(
        (entry) => entry.path_id === result.path_id,
      );
      const visualSection = visuals
        ? [
            "### Visual snapshots",
            `- Implementation contract: \`${visuals.component_evidence.implementation_contract_ref}\``,
            `- Preview source: \`${visuals.component_evidence.preview_source_ref}\``,
            `- Preview HTML: \`${visuals.preview_ref}\``,
            `- Desktop light: \`${visuals.screenshots.desktop_light_ref}\``,
            `- Desktop dark: \`${visuals.screenshots.desktop_dark_ref}\``,
            "",
            `![${result.path_id} desktop light](${visuals.screenshots.desktop_light_ref})`,
            "",
            `![${result.path_id} desktop dark](${visuals.screenshots.desktop_dark_ref})`,
            "",
          ].join("\n")
        : [
            "### Visual snapshots",
            "- Missing visual artifacts",
            "",
          ].join("\n");

      return [
        `## ${testPath?.title ?? result.path_id}`,
        "",
        `- Path ID: ${result.path_id}`,
        `- Verdict: ${result.verdict.status}`,
        `- Recommended action: ${result.verdict.recommended_action}`,
        `- Rationale: ${result.rationale}`,
        "",
        visualSection,
        "### Strongest evidence",
        evidence || "- None provided",
        "",
        "### Cleanup notes",
        `- Reduced cleanup: ${result.cleanup_notes.reduced_cleanup}`,
        `- Remaining cleanup: ${result.cleanup_notes.remaining_cleanup}`,
        `- JudgmentKit impact: ${result.cleanup_notes.judgmentkit_impact}`,
        "",
      ].join("\n");
    })
    .join("\n");

  const cleanupRisks = mergedSummary.comparison.top_cleanup_risks
    .map((item) => `- ${item}`)
    .join("\n");

  return [
    "# JudgmentKit AI UI E2E Final Comparison",
    "",
    `- Workflow: \`${mergedSummary.workflow_id}\``,
    `- Winner: ${mergedSummary.comparison.winner}`,
    `- Confidence: ${mergedSummary.comparison.confidence}`,
    `- Meaningful difference: ${mergedSummary.comparison.meaningful_difference ? "yes" : "no"}`,
    `- Recommended next action: ${mergedSummary.comparison.recommended_next_action}`,
    "",
    "## Shared MCP Verification",
    `- tools/list ref: \`${mergedSummary.shared_mcp_verification.tools_list_ref}\``,
    `- prompts/list ref: \`${mergedSummary.shared_mcp_verification.prompts_list_ref}\``,
    `- workflow bundle ref: \`${mergedSummary.shared_mcp_verification.workflow_bundle_ref}\``,
    `- call order ref: \`${mergedSummary.shared_mcp_verification.call_order_ref}\``,
    "",
    "## Visual Coverage",
    "- Capture mode: headless Chromium",
    "- Preview source: implementation-contract.json + preview-source.tsx -> preview.html",
    `- Color schemes: ${AI_UI_E2E_VISUAL_COLOR_SCHEMES.join(", ")}`,
    `- Viewport: ${AI_UI_E2E_VISUAL_VIEWPORT.width}x${AI_UI_E2E_VISUAL_VIEWPORT.height} @ ${AI_UI_E2E_VISUAL_VIEWPORT.deviceScaleFactor}x`,
    "",
    "## Side-by-Side Scores",
    "| Criterion | Path 1 | Path 2 | Winner | Notes |",
    "| --- | --- | --- | --- | --- |",
    scoreTableRows,
    "",
    pathSections,
    "## Comparison Result",
    `- Why this winner: ${mergedSummary.comparison.rationale}`,
    `- Did JudgmentKit materially change the outcome: ${mergedSummary.comparison.judgmentkit_impact_summary}`,
    "",
    "## Top Cleanup Risks",
    cleanupRisks || "- None provided",
  ].join("\n");
}

export function createExternalJudgePacketMarkdown(
  input: AiUiE2eExternalJudgePacketInput,
) {
  const requiredOutputs = getAiUiE2ePaths().map(
    (testPath) => `- \`${testPath.id}/path-score.json\``,
  );
  const sharedArtifacts = [
    "## Shared Artifacts",
    "### mcp-call-order.json",
    "```json",
    JSON.stringify(input.shared_artifacts.mcp_call_order, null, 2),
    "```",
    "",
    "### tools-list.json",
    "```json",
    JSON.stringify(input.shared_artifacts.tools_list, null, 2),
    "```",
    "",
    "### prompts-list.json",
    "```json",
    JSON.stringify(input.shared_artifacts.prompts_list, null, 2),
    "```",
    "",
    "### start-design-workflow.txt",
    "```text",
    input.shared_artifacts.start_design_workflow,
    "```",
    "",
    "### start-no-design-system-workflow.txt",
    "```text",
    input.shared_artifacts.start_no_design_system_workflow,
    "```",
    "",
    "### workflow-bundle.json",
    "```json",
    JSON.stringify(input.shared_artifacts.workflow_bundle, null, 2),
    "```",
  ].join("\n");

  const pathSections = input.path_packets
    .map((packet) =>
      [
        `## ${packet.path.title}`,
        "",
        "### judge-input.json",
        "```json",
        JSON.stringify(packet.judge_input, null, 2),
        "```",
        "",
        "### transcript.md",
        "````markdown",
        packet.transcript,
        "````",
        "",
        "### response.md",
        "````markdown",
        packet.response,
        "````",
        "",
        "### implementation-contract.json",
        "```json",
        JSON.stringify(packet.implementation_contract, null, 2),
        "```",
        "",
        "### preview-source.tsx",
        "```tsx",
        packet.preview_source,
        "```",
        "",
        `### Output target: ${packet.path.id}/path-score.json`,
        "```json",
        JSON.stringify(packet.path_score_template, null, 2),
        "```",
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "# JudgmentKit AI UI E2E External Judge Packet",
    "",
    `Bundle directory: \`${input.output_directory}\``,
    "",
    "Copy this entire packet into the external judging model.",
    "",
    "## Required outputs",
    "Return exactly three completed JSON objects matching the included templates:",
    ...requiredOutputs,
    "- `comparison.json`",
    "",
    "## Judge Prompt",
    "````markdown",
    input.judge_prompt,
    "````",
    "",
    "## comparison.json output template",
    "```json",
    JSON.stringify(input.comparison_template, null, 2),
    "```",
    "",
    "## judge-comparison-input.json",
    "```json",
    JSON.stringify(input.comparison_input, null, 2),
    "```",
    "",
    sharedArtifacts,
    "",
    pathSections,
  ].join("\n");
}
