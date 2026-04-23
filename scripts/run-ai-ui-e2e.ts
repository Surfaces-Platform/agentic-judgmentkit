import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  AI_UI_E2E_FEATURE_INTENT,
  AI_UI_E2E_WORKFLOW_ID,
  createCodexSeedPrompt,
  createEvidenceTemplate,
  getDefaultAiUiE2eArtifactsDir,
  getAiUiE2ePaths,
} from "@/lib/ai-ui-e2e";
import {
  createComparisonJudgeInput,
  createComparisonTemplate,
  createImplementationContractTemplate,
  createJudgePrompt,
  createPathJudgeInput,
  createPathScoreTemplate,
  createPreviewSourceTemplate,
  createVisualManifestTemplate,
} from "@/lib/ai-ui-e2e-evaluator";
import { writeGeneratedArtifacts } from "@/lib/site";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

async function ensureDirectory(directory: string) {
  await fs.mkdir(directory, { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath: string, value: string) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${value.endsWith("\n") ? value : `${value}\n`}`);
}

function getOutputDirectory() {
  const argPath = process.argv[2];
  if (argPath) {
    return path.resolve(process.cwd(), argPath);
  }

  return getDefaultAiUiE2eArtifactsDir();
}

async function main() {
  const outputDirectory = getOutputDirectory();
  await ensureDirectory(outputDirectory);

  const site = await writeGeneratedArtifacts();
  await writeJson(path.join(outputDirectory, "generated-site-summary.json"), {
    generated_at: new Date().toISOString(),
    page_count: site.pages.length,
    resource_count: site.resourceIndex.resources.length,
    schema_count: site.resourceIndex.schemas.length,
  });

  const transport = new StdioClientTransport({
    command: "npm",
    args: ["--prefix", process.cwd(), "run", "mcp:stdio"],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const stderrChunks: string[] = [];
  transport.stderr?.on("data", (chunk: Buffer | string) => {
    stderrChunks.push(chunk.toString());
  });

  const client = new Client({
    name: "judgmentkit-ai-ui-e2e",
    version: "1.0.0",
  });

  try {
    await withTimeout(client.connect(transport), 5_000);

    const toolsResponse = await withTimeout(client.listTools(), 5_000);
    const promptsResponse = await withTimeout(client.listPrompts(), 5_000);
    const startPromptResponse = await withTimeout(
      client.getPrompt({
        name: "start_design_workflow",
        arguments: {
          feature_intent: AI_UI_E2E_FEATURE_INTENT,
        },
      }),
      5_000,
    );
    const startNoDesignPromptResponse = await withTimeout(
      client.getPrompt({
        name: "start_no_design_system_workflow",
        arguments: {
          feature_intent: AI_UI_E2E_FEATURE_INTENT,
        },
      }),
      5_000,
    );
    const workflowBundleResponse = await withTimeout(
      client.callTool({
        name: "get_workflow_bundle",
        arguments: {
          workflow_id: "workflow.ai-ui-generation",
          feature_intent: AI_UI_E2E_FEATURE_INTENT,
        },
      }),
      5_000,
    );

    await writeJson(path.join(outputDirectory, "tools-list.json"), toolsResponse);
    await writeJson(path.join(outputDirectory, "prompts-list.json"), promptsResponse);
    await writeJson(
      path.join(outputDirectory, "mcp-call-order.json"),
      [
        { step: 1, method: "tools/list" },
        {
          step: 2,
          method: "prompts/get",
          name_by_path: {
            "path-1-no-design-system": "start_no_design_system_workflow",
            "path-2-shadcn-radix": "start_design_workflow",
          },
          feature_intent: AI_UI_E2E_FEATURE_INTENT,
        },
        {
          step: 3,
          method: "tools/call",
          name: "get_workflow_bundle",
          arguments: {
            workflow_id: AI_UI_E2E_WORKFLOW_ID,
            feature_intent: AI_UI_E2E_FEATURE_INTENT,
          },
        },
      ],
    );

    if (startPromptResponse.messages[0]?.content.type !== "text") {
      throw new Error("start_design_workflow returned non-text prompt content.");
    }
    if (startNoDesignPromptResponse.messages[0]?.content.type !== "text") {
      throw new Error(
        "start_no_design_system_workflow returned non-text prompt content.",
      );
    }

    await writeText(
      path.join(outputDirectory, "start-design-workflow.txt"),
      startPromptResponse.messages[0].content.text,
    );
    await writeText(
      path.join(outputDirectory, "start-no-design-system-workflow.txt"),
      startNoDesignPromptResponse.messages[0].content.text,
    );
    await writeJson(
      path.join(outputDirectory, "workflow-bundle.json"),
      workflowBundleResponse.structuredContent ?? workflowBundleResponse,
    );
    await writeText(
      path.join(outputDirectory, "stdio-stderr.log"),
      stderrChunks.join(""),
    );

    const testPaths = getAiUiE2ePaths();

    for (const testPath of testPaths) {
      const pathDirectory = path.join(outputDirectory, testPath.id);
      await ensureDirectory(pathDirectory);
      await ensureDirectory(path.join(pathDirectory, "screenshots"));
      await writeJson(path.join(pathDirectory, "metadata.json"), testPath);
      await writeText(
        path.join(pathDirectory, "codex-seed-prompt.md"),
        createCodexSeedPrompt(testPath),
      );
      await writeText(
        path.join(pathDirectory, "transcript.md"),
        [
          `# ${testPath.title} Transcript`,
          "",
          "Paste the exact Codex transcript for this run here.",
          "",
          "## MCP calls made",
          "- ",
          "",
          "## Final generated UI response",
          "",
        ].join("\n"),
      );
      await writeText(
        path.join(pathDirectory, "response.md"),
        `# ${testPath.title} Final Response\n\nPaste the final generated UI response here.\n`,
      );
      await writeJson(
        path.join(pathDirectory, "implementation-contract.json"),
        createImplementationContractTemplate(testPath),
      );
      await writeText(
        path.join(pathDirectory, "preview-source.tsx"),
        createPreviewSourceTemplate(testPath),
      );
      await writeText(
        path.join(pathDirectory, "preview.html"),
        [
          "<!doctype html>",
          '<html lang="en">',
          "  <head>",
          '    <meta charset="utf-8" />',
          '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
          `    <title>${testPath.title} Preview</title>`,
          "    <style>",
          "      :root { color-scheme: light dark; }",
          "      body {",
          "        margin: 0;",
          "        min-height: 100vh;",
          "        display: grid;",
          "        place-items: center;",
          "        font-family: ui-sans-serif, system-ui, sans-serif;",
          "        background: Canvas;",
          "        color: CanvasText;",
          "      }",
          "      main {",
          "        max-width: 54rem;",
          "        padding: 3rem;",
          "        border: 1px dashed currentColor;",
          "        border-radius: 1rem;",
          "      }",
          "    </style>",
          "  </head>",
          "  <body>",
          "    <main>",
          "      <h1>Replace this placeholder with a self-contained HTML preview for this path.</h1>",
          "      <p>",
          "        This file is generated by ai-ui:e2e:visuals from implementation-contract.json",
          "        and preview-source.tsx. Do not hand-author this preview.",
          "      </p>",
          "      <p>",
          "        Save real component evidence in implementation-contract.json and preview-source.tsx,",
          "        then let the evaluator derive preview.html before capturing screenshots.",
          "      </p>",
          "    </main>",
          "  </body>",
          "</html>",
        ].join("\n"),
      );
      await writeJson(
        path.join(pathDirectory, "judge-input.json"),
        createPathJudgeInput(outputDirectory, testPath),
      );
      await writeJson(
        path.join(pathDirectory, "path-score.json"),
        createPathScoreTemplate(testPath),
      );
      await writeJson(
        path.join(pathDirectory, "visual-manifest.json"),
        createVisualManifestTemplate(outputDirectory, testPath),
      );
    }

    await writeText(
      path.join(outputDirectory, "report-template.md"),
      createEvidenceTemplate(outputDirectory),
    );
    await writeJson(
      path.join(outputDirectory, "judge-comparison-input.json"),
      createComparisonJudgeInput(outputDirectory, testPaths),
    );
    await writeJson(
      path.join(outputDirectory, "comparison.json"),
      createComparisonTemplate(),
    );
    await writeText(
      path.join(outputDirectory, "judge-prompt.md"),
      createJudgePrompt(outputDirectory),
    );
    await writeText(
      path.join(outputDirectory, "NEXT-STEPS.md"),
      [
        "# JudgmentKit AI UI E2E Next Steps",
        "",
        `Canonical bundle path: \`${outputDirectory}\``,
        "",
        "## 1. Save the real run evidence",
        "",
        "Replace the placeholder contents in both path directories:",
        "",
        "- `transcript.md` must contain the full Codex conversation for that path.",
        "- `response.md` must contain only the final generated UI output for that path.",
        "- `implementation-contract.json` must be the machine-readable source of truth for component recipes, composition, states, accessibility, and theme bindings.",
        "- `preview-source.tsx` must derive a complete preview HTML document from implementation-contract.json.",
        "- Do not hand-author `preview.html`; the evaluator will generate it.",
        "- Leave `judge-input.json`, `path-score.json`, and `comparison.json` in place.",
        "",
        "## 2. Capture the visuals",
        "",
        "Run:",
        "",
        "```bash",
        "npm run ai-ui:e2e:visuals",
        "```",
        "",
        "This command fails intentionally if any implementation contract or preview source is still a placeholder, if preview.html is hand-authored, or if the generated preview depends on remote network assets.",
        "",
        "## 3. Build the external judge packet",
        "",
        "Run:",
        "",
        "```bash",
        "npm run ai-ui:e2e:judge-packet",
        "```",
        "",
        "This command fails intentionally if any transcript or response file still contains placeholder text.",
        "",
        "## 4. Run the external judge",
        "",
        "Use these files:",
        "",
        "- `external-judge-packet.md`",
        "- `judge-prompt.md`",
        "",
        "The external judge must complete:",
        "",
        ...testPaths.map((testPath) => `- \`${testPath.id}/path-score.json\``),
        "- `comparison.json`",
        "",
        "Judge requirements:",
        "",
        "- Use only `pass`, `warn`, or `fail` for verdict status.",
        "- Use only `allow`, `rewrite`, `review`, `block`, or `escalate` for recommended action.",
        "- Mark all three JSON outputs as `completed: true`.",
        "- Score all eight acceptance criteria and cite transcript/response evidence.",
        "",
        "## 5. Generate the final comparison summary",
        "",
        "Run:",
        "",
        "```bash",
        "npm run ai-ui:e2e:summary",
        "```",
        "",
        "This command fails intentionally until both path scores, the comparison, and the visual manifests are complete.",
      ].join("\n"),
    );

    process.stdout.write(`JudgmentKit AI UI E2E bundle written to ${outputDirectory}\n`);
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit AI UI E2E failed: ${message}\n`);
  process.exitCode = 1;
});
