import fs from "node:fs/promises";
import path from "node:path";

import {
  assertCompletedComparison,
  assertCompletedPathScore,
  assertCompletedVisualManifest,
  createFinalComparisonSummaryMarkdown,
  createMergedSummary,
  type AiUiE2eComparisonResult,
  type AiUiE2ePathScore,
  type AiUiE2eVisualManifest,
} from "@/lib/ai-ui-e2e-evaluator";
import { getAiUiE2ePaths, getDefaultAiUiE2eArtifactsDir } from "@/lib/ai-ui-e2e";

async function readJson<T>(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
    throw new Error(`Missing required judge artifact: ${filePath}`);
  }
}

async function main() {
  const outputDirectory = getOutputDirectory();
  const [pathOneConfig, pathTwoConfig] = getAiUiE2ePaths();
  if (!pathOneConfig || !pathTwoConfig) {
    throw new Error("AI UI E2E summary requires exactly two configured paths.");
  }

  const pathOneScorePath = path.join(outputDirectory, pathOneConfig.id, "path-score.json");
  const pathTwoScorePath = path.join(outputDirectory, pathTwoConfig.id, "path-score.json");
  const comparisonPath = path.join(outputDirectory, "comparison.json");
  const pathOneVisualPath = path.join(outputDirectory, pathOneConfig.id, "visual-manifest.json");
  const pathTwoVisualPath = path.join(outputDirectory, pathTwoConfig.id, "visual-manifest.json");

  await ensureExists(pathOneScorePath);
  await ensureExists(pathTwoScorePath);
  await ensureExists(comparisonPath);
  await ensureExists(pathOneVisualPath);
  await ensureExists(pathTwoVisualPath);

  const pathOne = await readJson<AiUiE2ePathScore>(pathOneScorePath);
  const pathTwo = await readJson<AiUiE2ePathScore>(pathTwoScorePath);
  const comparison = await readJson<AiUiE2eComparisonResult>(comparisonPath);
  const pathOneVisual = await readJson<AiUiE2eVisualManifest>(pathOneVisualPath);
  const pathTwoVisual = await readJson<AiUiE2eVisualManifest>(pathTwoVisualPath);

  assertCompletedPathScore(pathOne);
  assertCompletedPathScore(pathTwo);
  assertCompletedComparison(comparison);
  assertCompletedVisualManifest(pathOneVisual);
  assertCompletedVisualManifest(pathTwoVisual);

  await ensureExists(pathOneVisual.preview_ref);
  await ensureExists(pathOneVisual.component_evidence.implementation_contract_ref);
  await ensureExists(pathOneVisual.component_evidence.preview_source_ref);
  await ensureExists(pathOneVisual.screenshots.desktop_light_ref);
  await ensureExists(pathOneVisual.screenshots.desktop_dark_ref);
  await ensureExists(pathTwoVisual.preview_ref);
  await ensureExists(pathTwoVisual.component_evidence.implementation_contract_ref);
  await ensureExists(pathTwoVisual.component_evidence.preview_source_ref);
  await ensureExists(pathTwoVisual.screenshots.desktop_light_ref);
  await ensureExists(pathTwoVisual.screenshots.desktop_dark_ref);

  const mergedSummary = createMergedSummary(
    [pathOne, pathTwo],
    [pathOneVisual, pathTwoVisual],
    comparison,
    outputDirectory,
  );

  await writeJson(
    path.join(outputDirectory, "final-comparison-summary.json"),
    mergedSummary,
  );
  await writeText(
    path.join(outputDirectory, "final-comparison-summary.md"),
    createFinalComparisonSummaryMarkdown(mergedSummary),
  );

  process.stdout.write(
    `JudgmentKit AI UI E2E final summary written to ${outputDirectory}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit AI UI E2E summary failed: ${message}\n`);
  process.exitCode = 1;
});
