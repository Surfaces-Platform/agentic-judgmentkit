import fs from "node:fs/promises";
import path from "node:path";

import {
  createExternalJudgePacketMarkdown,
  hasPlaceholderEvidence,
  hasPlaceholderImplementationContract,
  hasPlaceholderPreviewSource,
  type AiUiE2eImplementationContract,
  type AiUiE2eComparisonInput,
  type AiUiE2eComparisonResult,
  type AiUiE2ePathJudgeInput,
  type AiUiE2ePathScore,
} from "@/lib/ai-ui-e2e-evaluator";
import { getAiUiE2ePaths, getDefaultAiUiE2eArtifactsDir } from "@/lib/ai-ui-e2e";

async function readJson<T>(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readText(filePath: string) {
  return fs.readFile(filePath, "utf8");
}

async function writeText(filePath: string, value: string) {
  await fs.writeFile(filePath, `${value.endsWith("\n") ? value : `${value}\n`}`);
}

function getOutputDirectory() {
  const argPath = process.argv[2];
  if (argPath) {
    return path.resolve(process.cwd(), argPath);
  }

  return getDefaultAiUiE2eArtifactsDir();
}

async function ensureExists(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required judge packet artifact: ${filePath}`);
  }
}

function assertFilledEvidence(filePath: string, content: string) {
  if (hasPlaceholderEvidence(content)) {
    throw new Error(
      `Evidence file still contains placeholder text: ${filePath}. Save the real transcript/response before building the external judge packet.`,
    );
  }
}

function assertFilledImplementationContract(filePath: string, content: string) {
  if (hasPlaceholderImplementationContract(content)) {
    throw new Error(
      `Implementation contract still contains placeholder text: ${filePath}. Save real component evidence before building the external judge packet.`,
    );
  }
}

function assertFilledPreviewSource(filePath: string, content: string) {
  if (hasPlaceholderPreviewSource(content)) {
    throw new Error(
      `Preview source still contains placeholder text: ${filePath}. Save a real preview-source.tsx before building the external judge packet.`,
    );
  }
}

async function main() {
  const outputDirectory = getOutputDirectory();
  const judgePromptPath = path.join(outputDirectory, "judge-prompt.md");
  const comparisonInputPath = path.join(outputDirectory, "judge-comparison-input.json");
  const comparisonTemplatePath = path.join(outputDirectory, "comparison.json");
  const mcpCallOrderPath = path.join(outputDirectory, "mcp-call-order.json");
  const toolsListPath = path.join(outputDirectory, "tools-list.json");
  const promptsListPath = path.join(outputDirectory, "prompts-list.json");
  const startDesignWorkflowPath = path.join(outputDirectory, "start-design-workflow.txt");
  const startNoDesignWorkflowPath = path.join(
    outputDirectory,
    "start-no-design-system-workflow.txt",
  );
  const workflowBundlePath = path.join(outputDirectory, "workflow-bundle.json");

  await ensureExists(judgePromptPath);
  await ensureExists(comparisonInputPath);
  await ensureExists(comparisonTemplatePath);
  await ensureExists(mcpCallOrderPath);
  await ensureExists(toolsListPath);
  await ensureExists(promptsListPath);
  await ensureExists(startDesignWorkflowPath);
  await ensureExists(startNoDesignWorkflowPath);
  await ensureExists(workflowBundlePath);

  const judgePrompt = await readText(judgePromptPath);
  const comparisonInput =
    await readJson<AiUiE2eComparisonInput>(comparisonInputPath);
  const comparisonTemplate =
    await readJson<AiUiE2eComparisonResult>(comparisonTemplatePath);

  const pathPackets = [];
  for (const testPath of getAiUiE2ePaths()) {
    const basePath = path.join(outputDirectory, testPath.id);
    const judgeInputPath = path.join(basePath, "judge-input.json");
    const transcriptPath = path.join(basePath, "transcript.md");
    const responsePath = path.join(basePath, "response.md");
    const implementationContractPath = path.join(
      basePath,
      "implementation-contract.json",
    );
    const previewSourcePath = path.join(basePath, "preview-source.tsx");
    const pathScoreTemplatePath = path.join(basePath, "path-score.json");

    await ensureExists(judgeInputPath);
    await ensureExists(transcriptPath);
    await ensureExists(responsePath);
    await ensureExists(implementationContractPath);
    await ensureExists(previewSourcePath);
    await ensureExists(pathScoreTemplatePath);

    const transcript = await readText(transcriptPath);
    const response = await readText(responsePath);
    const implementationContractText = await readText(implementationContractPath);
    const previewSource = await readText(previewSourcePath);
    assertFilledEvidence(transcriptPath, transcript);
    assertFilledEvidence(responsePath, response);
    assertFilledImplementationContract(
      implementationContractPath,
      implementationContractText,
    );
    assertFilledPreviewSource(previewSourcePath, previewSource);

    pathPackets.push({
      path: testPath,
      judge_input: await readJson<AiUiE2ePathJudgeInput>(judgeInputPath),
      transcript,
      response,
      implementation_contract:
        JSON.parse(implementationContractText) as AiUiE2eImplementationContract,
      preview_source: previewSource,
      path_score_template: await readJson<AiUiE2ePathScore>(pathScoreTemplatePath),
    });
  }

  const packet = createExternalJudgePacketMarkdown({
    output_directory: outputDirectory,
    judge_prompt: judgePrompt,
    comparison_input: comparisonInput,
    comparison_template: comparisonTemplate,
    shared_artifacts: {
      mcp_call_order: await readJson(mcpCallOrderPath),
      tools_list: await readJson(toolsListPath),
      prompts_list: await readJson(promptsListPath),
      start_design_workflow: await readText(startDesignWorkflowPath),
      start_no_design_system_workflow: await readText(startNoDesignWorkflowPath),
      workflow_bundle: await readJson(workflowBundlePath),
    },
    path_packets: pathPackets,
  });

  const outputPath = path.join(outputDirectory, "external-judge-packet.md");
  await writeText(outputPath, packet);
  process.stdout.write(`JudgmentKit AI UI external judge packet written to ${outputPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit AI UI judge packet failed: ${message}\n`);
  process.exitCode = 1;
});
