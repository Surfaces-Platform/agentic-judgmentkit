import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AI_UI_E2E_ARTIFACTS_DIR,
  AI_UI_E2E_FEATURE_INTENT,
  AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT,
  AI_UI_E2E_SHADCN_RADIX_CONTEXT,
  AI_UI_E2E_SHARED_PROMPT,
  createCodexSeedPrompt,
  createEvidenceTemplate,
  getDefaultAiUiE2eArtifactsDir,
  getAiUiE2ePaths,
} from "@/lib/ai-ui-e2e";
import {
  AI_UI_E2E_EVALUATOR_STATUSES,
  createImplementationContractTemplate,
  createComparisonJudgeInput,
  createComparisonTemplate,
  createExternalJudgePacketMarkdown,
  createFinalComparisonSummaryMarkdown,
  createPreviewSourceTemplate,
  createJudgePrompt,
  createMergedSummary,
  createPathJudgeInput,
  createPathScoreTemplate,
  createVisualManifestTemplate,
  hasPlaceholderEvidence,
  hasPlaceholderPreview,
} from "@/lib/ai-ui-e2e-evaluator";

function runTsxScript(scriptPath: string, args: string[]) {
  return execFileSync(process.execPath, ["--import", "tsx", scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function writeVisualEvidenceFixture(baseDir: string, testPath: ReturnType<typeof getAiUiE2ePaths>[number]) {
  const contract = createImplementationContractTemplate(testPath);
  const recipeId = "workspace-shell";
  const screenId = "workspace-home";
  const themeBindings =
    testPath.id === "path-1-no-design-system"
      ? ["--jk-color-canvas", "--jk-color-surface", "--jk-color-accent"]
      : ["--background", "--card", "--primary"];

  contract.response_alignment = {
    component_recipe_ids: [recipeId],
    state_ids: ["loading", "empty", "ready", "error", "review-needed", "disabled"],
    theme_bindings: themeBindings,
  };
  if (contract.token_spec) {
    contract.token_spec.bindings = themeBindings;
  }
  if (contract.design_system_bindings) {
    contract.design_system_bindings = ["Sidebar", "Card", "Tabs", "Dialog"];
  }
  contract.component_recipes = [
    {
      recipe_id: recipeId,
      title: "Workspace shell",
      primitive_id: "layout-shell",
      source_of_truth:
        testPath.id === "path-1-no-design-system"
          ? "constraint-pack.ai-ui-no-design-system"
          : "shadcn-radix",
      slots: ["rail", "header", "main", "inspector"],
      allowed_variants: ["with-rail", "with-inspector"],
      interaction_rules: ["Keep local actions inside the governed surface."],
      accessibility_contract: ["Preserve landmarks and heading order."],
      react_tailwind:
        "export function WorkspaceShell(){return <div className=\"grid min-h-screen\">...</div>}",
    },
  ];
  contract.screen_composition = [
    {
      screen_id: screenId,
      title: "Workspace home",
      recipe_ids: [recipeId],
      primary_actions: ["Generate first pass"],
      notes: ["Keep inspector evidence secondary to the main workflow."],
    },
  ];
  contract.state_coverage = [
    "loading",
    "empty",
    "ready",
    "error",
    "review-needed",
    "disabled",
  ].map((state) => ({
    state,
    applies_to: [screenId],
    behavior: [`${state} state remains inside the same workspace shell.`],
  }));
  contract.theme_contract = {
    bindings: themeBindings,
    parity_rules: ["Light and dark tokens stay bound to the same surfaces."],
  };
  contract.accessibility_contract = {
    global_rules: ["Use semantic landmarks and explicit labels."],
    focus_rules: ["Keep focus-visible rings on interactive elements."],
    keyboard_rules: ["Support keyboard navigation for tabs and dialogs."],
    motion_rules: ["Reduce motion when the user requests it."],
  };
  contract.escalation_items = ["Escalate unsupported enterprise auth states."];

  const response = [
    "# Final UI output",
    "",
    ...contract.required_sections,
    "",
    `Recipe ids: ${contract.response_alignment.component_recipe_ids.join(", ")}`,
    `States: ${contract.response_alignment.state_ids.join(", ")}`,
    `Theme bindings: ${contract.response_alignment.theme_bindings.join(", ")}`,
  ].join("\n");

  const previewSource = [
    "export default function renderPreview({ contract }) {",
    "  const recipes = contract.component_recipes",
    "    .map((recipe) => `<li>${recipe.recipe_id}: ${recipe.title}</li>`)",
    "    .join('');",
    "  return `<!doctype html>",
    "<html lang=\"en\">",
    "  <head>",
    "    <meta charset=\"utf-8\" />",
    "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "    <style>:root{color-scheme:light dark}body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:Canvas;color:CanvasText}main{padding:48px;display:grid;gap:16px}.panel{border:1px solid currentColor;border-radius:24px;padding:24px}</style>",
    `    <title>${testPath.title}</title>`,
    "  </head>",
    "  <body>",
    "    <main>",
    "      <h1>${contract.path_id}</h1>",
    "      <section class=\"panel\">",
    "        <h2>${contract.screen_composition[0]?.title ?? 'Preview'}</h2>",
    "        <ul>${recipes}</ul>",
    "      </section>",
    "    </main>",
    "  </body>",
    "</html>`;",
    "}",
    "",
  ].join("\n");

  writeFileSync(
    path.join(baseDir, "implementation-contract.json"),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  writeFileSync(path.join(baseDir, "response.md"), `${response}\n`);
  writeFileSync(path.join(baseDir, "preview-source.tsx"), previewSource);
}

describe("AI UI E2E harness", () => {
  it("keeps the shared prompt identical across both paths", () => {
    const [pathOne, pathTwo] = getAiUiE2ePaths();

    expect(pathOne?.systemContext).toBe(AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT);
    expect(pathTwo?.systemContext).toBe(AI_UI_E2E_SHADCN_RADIX_CONTEXT);

    expect(createCodexSeedPrompt(pathOne!)).toContain(AI_UI_E2E_SHARED_PROMPT);
    expect(createCodexSeedPrompt(pathTwo!)).toContain(AI_UI_E2E_SHARED_PROMPT);
    expect(createCodexSeedPrompt(pathOne!)).toContain(
      AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT,
    );
    expect(createCodexSeedPrompt(pathOne!)).toContain(
      "start_no_design_system_workflow",
    );
    expect(createCodexSeedPrompt(pathOne!)).toContain(
      "token_spec, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
    );
    expect(createCodexSeedPrompt(pathTwo!)).toContain(AI_UI_E2E_SHADCN_RADIX_CONTEXT);
    expect(createCodexSeedPrompt(pathTwo!)).toContain("start_design_workflow");
    expect(createCodexSeedPrompt(pathTwo!)).toContain(
      "design_system_bindings, component_recipes, screen_composition, state_coverage, theme_contract, accessibility_contract, escalation_items",
    );
  });

  it("renders an evidence template with both paths and the shared feature intent", () => {
    const template = createEvidenceTemplate("/tmp/judgmentkit-ai-ui-e2e");

    expect(template).toContain(AI_UI_E2E_FEATURE_INTENT);
    expect(template).toContain(
      "Path 1: JudgmentKit portable authority without an external design system",
    );
    expect(template).toContain("Path 2: One-shot with Shadcn+Radix");
    expect(template).toContain("First-shot usefulness");
    expect(template).toContain("Cleanup load");
    expect(template).toContain("Workflow adherence");
    expect(template).toContain("Handoff quality");
  });

  it("creates judge input packets that preserve the shared prompt and criterion list", () => {
    const [pathOne, pathTwo] = getAiUiE2ePaths();
    const pathOneInput = createPathJudgeInput("/tmp/judgmentkit-ai-ui-e2e", pathOne!);
    const pathTwoInput = createPathJudgeInput("/tmp/judgmentkit-ai-ui-e2e", pathTwo!);

    expect(pathOneInput.shared_prompt).toBe(AI_UI_E2E_SHARED_PROMPT);
    expect(pathTwoInput.shared_prompt).toBe(AI_UI_E2E_SHARED_PROMPT);
    expect(pathOneInput.path.systemContext).toBe(
      AI_UI_E2E_PORTABLE_AUTHORITY_CONTEXT,
    );
    expect(pathTwoInput.path.systemContext).toBe(AI_UI_E2E_SHADCN_RADIX_CONTEXT);
    expect(pathOneInput.rubric.criteria).toHaveLength(8);
    expect(pathTwoInput.rubric.criteria).toHaveLength(8);
  });

  it("creates comparison packets and templates with the local evaluator vocabulary", () => {
    const comparisonInput = createComparisonJudgeInput(
      "/tmp/judgmentkit-ai-ui-e2e",
      getAiUiE2ePaths(),
    );
    const comparisonTemplate = createComparisonTemplate();
    const pathTemplate = createPathScoreTemplate(getAiUiE2ePaths()[0]!);
    const visualTemplate = createVisualManifestTemplate(
      "/tmp/judgmentkit-ai-ui-e2e",
      getAiUiE2ePaths()[0]!,
    );

    expect(comparisonInput.controlled_variable).toContain("exact same prompt text");
    expect(comparisonTemplate.completed).toBe(false);
    expect(pathTemplate.completed).toBe(false);
    expect(visualTemplate.completed).toBe(false);
    expect(visualTemplate.capture.browser).toBe("chromium");
    expect(visualTemplate.capture.color_schemes).toEqual(["light", "dark"]);
    expect(AI_UI_E2E_EVALUATOR_STATUSES).toEqual(["pass", "warn", "fail"]);
    expect(pathTemplate.criteria).toHaveLength(8);
  });

  it("defaults the local bundle path to the tracked repo artifacts directory", () => {
    expect(getDefaultAiUiE2eArtifactsDir()).toBe(AI_UI_E2E_ARTIFACTS_DIR);
    expect(getDefaultAiUiE2eArtifactsDir()).toMatch(/artifacts\/ai-ui-e2e-evaluator$/);
  });

  it("renders a deterministic final summary from completed judge outputs", () => {
    const [pathOne, pathTwo] = getAiUiE2ePaths();
    const pathOneScore = createPathScoreTemplate(pathOne!);
    const pathTwoScore = createPathScoreTemplate(pathTwo!);
    const pathOneVisual = createVisualManifestTemplate(
      "/tmp/judgmentkit-ai-ui-e2e",
      pathOne!,
    );
    const pathTwoVisual = createVisualManifestTemplate(
      "/tmp/judgmentkit-ai-ui-e2e",
      pathTwo!,
    );
    const comparison = createComparisonTemplate();

    pathOneScore.completed = true;
    pathOneScore.verdict = {
      ...pathOneScore.verdict,
      verdict_id: "ver_path_1",
      decision_id: "dec_path_1",
      evaluated_at: "2026-04-12T00:00:00.000Z",
      status: "pass",
      recommended_action: "allow",
    };
    pathOneScore.criteria[0] = {
      criterion: "First-shot usefulness",
      score: 4,
      notes: "Strong starting structure.",
      evidence: ["transcript evidence"],
    };
    pathOneScore.strongest_evidence = ["Clear onboarding in the first screen."];
    pathOneScore.cleanup_notes = {
      reduced_cleanup: "Structure was already usable.",
      remaining_cleanup: "Minor copy tightening remained.",
      judgmentkit_impact: "Kept the first pass restrained.",
    };
    pathOneScore.rationale = "Path 1 balanced clarity and restraint well.";

    pathTwoScore.completed = true;
    pathTwoScore.verdict = {
      ...pathTwoScore.verdict,
      verdict_id: "ver_path_2",
      decision_id: "dec_path_2",
      evaluated_at: "2026-04-12T00:00:00.000Z",
      status: "warn",
      recommended_action: "review",
    };
    pathTwoScore.criteria[0] = {
      criterion: "First-shot usefulness",
      score: 5,
      notes: "Shadcn+Radix guidance gave stronger component discipline.",
      evidence: ["response evidence"],
    };
    pathTwoScore.strongest_evidence = ["System fidelity stayed explicit."];
    pathTwoScore.cleanup_notes = {
      reduced_cleanup: "Design-system fidelity reduced token cleanup.",
      remaining_cleanup: "A few flows still needed simplification.",
      judgmentkit_impact: "Shadcn+Radix guidance changed the result meaningfully.",
    };
    pathTwoScore.rationale = "Path 2 was stronger because the system context improved fit.";

    pathOneVisual.completed = true;
    pathOneVisual.captured_at = "2026-04-12T00:00:00.000Z";
    pathTwoVisual.completed = true;
    pathTwoVisual.captured_at = "2026-04-12T00:00:00.000Z";

    comparison.completed = true;
    comparison.winner = pathTwo!.id;
    comparison.confidence = 0.82;
    comparison.meaningful_difference = true;
    comparison.recommended_next_action = "allow";
    comparison.rationale = "Path 2 had stronger system fidelity without harming clarity.";
    comparison.criteria_deltas[0] = {
      criterion: "First-shot usefulness",
      winner: pathTwo!.id,
      delta: 1,
      notes: "Better component fit.",
    };
    comparison.strongest_evidence = {
      "path-1-no-design-system": ["Good fallback restraint."],
      [pathTwo!.id]: ["Better use of Shadcn+Radix primitives."],
    };
    comparison.top_cleanup_risks = ["Final copy still needs product review."];
    comparison.judgmentkit_impact_summary =
      "JudgmentKit meaningfully improved both runs, and Shadcn+Radix improved the winning path.";

    const markdown = createFinalComparisonSummaryMarkdown(
      createMergedSummary(
        [pathOneScore, pathTwoScore],
        [pathOneVisual, pathTwoVisual],
        comparison,
        "/tmp/judgmentkit-ai-ui-e2e",
      ),
    );

    expect(markdown).toContain(`Winner: ${pathTwo!.id}`);
    expect(markdown).toContain("Capture mode: headless Chromium");
    expect(markdown).toContain("Side-by-Side Scores");
    expect(markdown).toContain("Implementation contract:");
    expect(markdown).toContain("Preview source:");
    expect(markdown).toContain("![path-1-no-design-system desktop light]");
    expect(markdown).toContain(`![${pathTwo!.id} desktop dark]`);
    expect(markdown).toContain("Did JudgmentKit materially change the outcome");
    expect(markdown).toContain("Top Cleanup Risks");
  });

  it("renders a judge prompt that points to both path packets and the comparison packet", () => {
    const prompt = createJudgePrompt("/tmp/judgmentkit-ai-ui-e2e");

    expect(prompt).toContain("judge-comparison-input.json");
    expect(prompt).toContain("path-1-no-design-system");
    expect(prompt).toContain("path-2-shadcn-radix");
    expect(prompt).toContain("path-level authority context");
    expect(prompt).toContain("Avoid rewarding ornamental novelty");
  });

  it("detects placeholder transcript and response content", () => {
    expect(
      hasPlaceholderEvidence("Paste the exact Codex transcript for this run here."),
    ).toBe(true);
    expect(
      hasPlaceholderEvidence("Paste the final generated UI response here."),
    ).toBe(true);
    expect(hasPlaceholderEvidence("Real transcript content.")).toBe(false);
  });

  it("detects placeholder preview content", () => {
    expect(
      hasPlaceholderPreview(
        "Replace this placeholder with a self-contained HTML preview for this path.",
      ),
    ).toBe(true);
    expect(hasPlaceholderPreview("<!doctype html><html><body>Real preview</body></html>")).toBe(
      false,
    );
  });

  it("renders a single external judge packet with inline evidence and output templates", () => {
    const [pathOne, pathTwo] = getAiUiE2ePaths();
    const packet = createExternalJudgePacketMarkdown({
      output_directory: "/tmp/judgmentkit-ai-ui-e2e",
      judge_prompt: createJudgePrompt("/tmp/judgmentkit-ai-ui-e2e"),
      comparison_input: createComparisonJudgeInput(
        "/tmp/judgmentkit-ai-ui-e2e",
        getAiUiE2ePaths(),
      ),
      comparison_template: createComparisonTemplate(),
      shared_artifacts: {
        mcp_call_order: [{ step: 1, method: "tools/list" }],
        tools_list: { tools: ["get_workflow_bundle"] },
        prompts_list: {
          prompts: ["start_design_workflow", "start_no_design_system_workflow"],
        },
        start_design_workflow: "Use JudgmentKit for this design task.",
        start_no_design_system_workflow:
          "Use JudgmentKit for this no-design-system design task.",
        workflow_bundle: { id: "workflow.ai-ui-generation" },
      },
      path_packets: [
        {
          path: pathOne!,
          judge_input: createPathJudgeInput("/tmp/judgmentkit-ai-ui-e2e", pathOne!),
          transcript: "Real transcript path 1",
          response: "Real response path 1",
          implementation_contract: createImplementationContractTemplate(pathOne!),
          preview_source: createPreviewSourceTemplate(pathOne!),
          path_score_template: createPathScoreTemplate(pathOne!),
        },
        {
          path: pathTwo!,
          judge_input: createPathJudgeInput("/tmp/judgmentkit-ai-ui-e2e", pathTwo!),
          transcript: "Real transcript path 2",
          response: "Real response path 2",
          implementation_contract: createImplementationContractTemplate(pathTwo!),
          preview_source: createPreviewSourceTemplate(pathTwo!),
          path_score_template: createPathScoreTemplate(pathTwo!),
        },
      ],
    });

    expect(packet).toContain("External Judge Packet");
    expect(packet).toContain("judge-comparison-input.json");
    expect(packet).toContain("path-1-no-design-system/path-score.json");
    expect(packet).toContain("path-2-shadcn-radix/path-score.json");
    expect(packet).toContain("Real transcript path 1");
    expect(packet).toContain("Real response path 2");
    expect(packet).toContain("### implementation-contract.json");
    expect(packet).toContain("### preview-source.tsx");
    expect(packet).toContain("start-no-design-system-workflow.txt");
  });

  it("captures desktop light and dark screenshots headlessly from derived preview fixtures", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ai-ui-e2e-"));
    const captureScript = path.join(
      process.cwd(),
      "scripts",
      "capture-ai-ui-e2e-visuals.ts",
    );

    try {
      for (const testPath of getAiUiE2ePaths()) {
        const baseDir = path.join(tempDir, testPath.id);
        mkdirSync(baseDir, { recursive: true });
        writeVisualEvidenceFixture(baseDir, testPath);
      }

      const output = runTsxScript(captureScript, [tempDir]);
      expect(output).toContain("JudgmentKit AI UI E2E visuals written");

      for (const testPath of getAiUiE2ePaths()) {
        const baseDir = path.join(tempDir, testPath.id);
        const manifest = JSON.parse(
          readFileSync(path.join(baseDir, "visual-manifest.json"), "utf8"),
        );

        expect(manifest.completed).toBe(true);
        expect(manifest.capture.headless).toBe(true);
        expect(manifest.capture.browser).toBe("chromium");
        expect(manifest.capture.color_schemes).toEqual(["light", "dark"]);
        expect(manifest.derivation.generated_from_contract).toBe(true);
        expect(manifest.component_evidence.implementation_contract_ref).toContain(
          "implementation-contract.json",
        );
        expect(
          readFileSync(path.join(baseDir, "preview.html"), "utf8"),
        ).toContain("judgmentkit-ai-ui-e2e-generated-preview");
        expect(
          readFileSync(path.join(baseDir, "screenshots", "desktop-light.png")).length,
        ).toBeGreaterThan(0);
        expect(
          readFileSync(path.join(baseDir, "screenshots", "desktop-dark.png")).length,
        ).toBeGreaterThan(0);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails visual capture when preview.html is hand-authored instead of derived", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ai-ui-e2e-"));
    const captureScript = path.join(
      process.cwd(),
      "scripts",
      "capture-ai-ui-e2e-visuals.ts",
    );

    try {
      for (const testPath of getAiUiE2ePaths()) {
        const baseDir = path.join(tempDir, testPath.id);
        mkdirSync(baseDir, { recursive: true });
        writeVisualEvidenceFixture(baseDir, testPath);
        writeFileSync(
          path.join(baseDir, "preview.html"),
          "<!doctype html><html><body>Hand-authored preview.</body></html>",
        );
      }

      expect(() => runTsxScript(captureScript, [tempDir])).toThrowError(
        /hand-authored preview\.html is not allowed/,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails visual capture when implementation contract and response disagree", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ai-ui-e2e-"));
    const captureScript = path.join(
      process.cwd(),
      "scripts",
      "capture-ai-ui-e2e-visuals.ts",
    );

    try {
      for (const testPath of getAiUiE2ePaths()) {
        const baseDir = path.join(tempDir, testPath.id);
        mkdirSync(baseDir, { recursive: true });
        writeVisualEvidenceFixture(baseDir, testPath);
        writeFileSync(path.join(baseDir, "response.md"), "# Final UI output\n\ncore_screens\n");
      }

      expect(() => runTsxScript(captureScript, [tempDir])).toThrowError(
        /implementation-contract\.json and response\.md disagree/,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails summary generation when visual manifests are missing", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "judgmentkit-ai-ui-e2e-"));
    const summaryScript = path.join(
      process.cwd(),
      "scripts",
      "summarize-ai-ui-e2e.ts",
    );
    const [pathOne, pathTwo] = getAiUiE2ePaths();
    const pathOneScore = createPathScoreTemplate(pathOne!);
    const pathTwoScore = createPathScoreTemplate(pathTwo!);
    const comparison = createComparisonTemplate();

    pathOneScore.completed = true;
    pathOneScore.verdict = {
      ...pathOneScore.verdict,
      verdict_id: "p1",
      decision_id: "p1",
      evaluated_at: "2026-04-14T00:00:00.000Z",
      status: "pass",
      recommended_action: "allow",
    };
    pathTwoScore.completed = true;
    pathTwoScore.verdict = {
      ...pathTwoScore.verdict,
      verdict_id: "p2",
      decision_id: "p2",
      evaluated_at: "2026-04-14T00:00:00.000Z",
      status: "pass",
      recommended_action: "allow",
    };
    comparison.completed = true;
    comparison.winner = "tie";

    try {
      mkdirSync(path.join(tempDir, pathOne!.id), { recursive: true });
      mkdirSync(path.join(tempDir, pathTwo!.id), { recursive: true });
      writeFileSync(
        path.join(tempDir, pathOne!.id, "path-score.json"),
        `${JSON.stringify(pathOneScore, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tempDir, pathTwo!.id, "path-score.json"),
        `${JSON.stringify(pathTwoScore, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tempDir, "comparison.json"),
        `${JSON.stringify(comparison, null, 2)}\n`,
      );

      expect(() => runTsxScript(summaryScript, [tempDir])).toThrowError(
        /Missing required judge artifact: .*visual-manifest\.json/,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
