import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser } from "playwright-chromium";

import { getAiUiE2ePaths, getDefaultAiUiE2eArtifactsDir } from "@/lib/ai-ui-e2e";
import {
  AI_UI_E2E_VISUAL_COLOR_SCHEMES,
  AI_UI_E2E_VISUAL_VIEWPORT,
  collectImplementationContractAlignmentErrors,
  createGeneratedPreviewMarker,
  createVisualManifestTemplate,
  hasPlaceholderEvidence,
  hasPlaceholderImplementationContract,
  hasPlaceholderPreview,
  hasPlaceholderPreviewSource,
  isGeneratedPreview,
  type AiUiE2eImplementationContract,
} from "@/lib/ai-ui-e2e-evaluator";

async function ensureDirectory(directory: string) {
  await fs.mkdir(directory, { recursive: true });
}

async function ensureExists(filePath: string) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required visual artifact: ${filePath}`);
  }
}

async function readText(filePath: string) {
  return fs.readFile(filePath, "utf8");
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readText(filePath)) as T;
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

function assertRenderablePreview(filePath: string, content: string) {
  if (hasPlaceholderPreview(content)) {
    throw new Error(
      `Preview file still contains placeholder text: ${filePath}. Save a real implementation-contract.json and preview-source.tsx before capturing screenshots.`,
    );
  }

  if (!/<html[\s>]/i.test(content)) {
    throw new Error(`Preview file is not a complete HTML document: ${filePath}`);
  }
}

function assertImplementationContract(
  filePath: string,
  content: string,
  contract: AiUiE2eImplementationContract,
  pathId: string,
) {
  if (hasPlaceholderImplementationContract(content)) {
    throw new Error(
      `Implementation contract still contains placeholder text: ${filePath}. Save real component evidence before capturing screenshots.`,
    );
  }

  if (contract.kind !== "ai_ui_e2e_implementation_contract") {
    throw new Error(`Implementation contract has invalid kind: ${filePath}`);
  }

  if (contract.path_id !== pathId) {
    throw new Error(
      `Implementation contract path_id ${contract.path_id} does not match ${pathId}.`,
    );
  }

  if (contract.component_recipes.length === 0) {
    throw new Error(`Implementation contract must include component_recipes: ${filePath}`);
  }
}

function assertPreviewSource(filePath: string, content: string) {
  if (hasPlaceholderPreviewSource(content)) {
    throw new Error(
      `Preview source still contains placeholder text: ${filePath}. Save a real preview-source.tsx before capturing screenshots.`,
    );
  }
}

async function renderPreviewHtml(
  previewSourcePath: string,
  contract: AiUiE2eImplementationContract,
) {
  const moduleUrl = `${pathToFileURL(previewSourcePath).toString()}?t=${Date.now()}`;
  const previewModule = (await import(moduleUrl)) as {
    default?: (args: { contract: AiUiE2eImplementationContract }) => string | Promise<string>;
    renderPreview?: (args: {
      contract: AiUiE2eImplementationContract;
    }) => string | Promise<string>;
  };
  const renderPreview = previewModule.default ?? previewModule.renderPreview;

  if (typeof renderPreview !== "function") {
    throw new Error(
      `preview-source.tsx must export a default function or renderPreview(): ${previewSourcePath}`,
    );
  }

  const html = await Promise.resolve(renderPreview({ contract }));
  if (typeof html !== "string") {
    throw new Error(`preview-source.tsx must return an HTML string: ${previewSourcePath}`);
  }

  return html.startsWith("<!doctype html>") ? html : `<!doctype html>\n${html}`;
}

async function capturePathVisuals(
  browser: Browser,
  outputDirectory: string,
  pathId: string,
) {
  const testPath = getAiUiE2ePaths().find((entry) => entry.id === pathId);
  if (!testPath) {
    throw new Error(`Unknown AI UI E2E path: ${pathId}`);
  }

  const manifest = createVisualManifestTemplate(outputDirectory, testPath);
  const screenshotDirectory = path.dirname(manifest.screenshots.desktop_light_ref);
  await ensureDirectory(screenshotDirectory);

  const implementationContractPath =
    manifest.component_evidence.implementation_contract_ref;
  const previewSourcePath = manifest.component_evidence.preview_source_ref;
  const responsePath = path.join(outputDirectory, pathId, "response.md");
  await ensureExists(implementationContractPath);
  await ensureExists(previewSourcePath);
  await ensureExists(responsePath);

  const implementationContractText = await readText(implementationContractPath);
  const implementationContract = JSON.parse(
    implementationContractText,
  ) as AiUiE2eImplementationContract;
  assertImplementationContract(
    implementationContractPath,
    implementationContractText,
    implementationContract,
    pathId,
  );

  const previewSourceContent = await readText(previewSourcePath);
  assertPreviewSource(previewSourcePath, previewSourceContent);

  const responseContent = await readText(responsePath);
  if (hasPlaceholderEvidence(responseContent)) {
    throw new Error(
      `Response file still contains placeholder text: ${responsePath}. Save the real response before capturing screenshots.`,
    );
  }

  const alignmentErrors = collectImplementationContractAlignmentErrors(
    implementationContract,
    responseContent,
  );
  if (alignmentErrors.length > 0) {
    throw new Error(
      `implementation-contract.json and response.md disagree for ${pathId}: ${alignmentErrors.join(
        " | ",
      )}`,
    );
  }

  let existingPreview = "";
  try {
    existingPreview = await readText(manifest.preview_ref);
  } catch {
    existingPreview = "";
  }

  if (
    existingPreview &&
    !hasPlaceholderPreview(existingPreview) &&
    !isGeneratedPreview(existingPreview)
  ) {
    throw new Error(
      `preview.html must be generated from preview-source.tsx for ${pathId}; hand-authored preview.html is not allowed.`,
    );
  }

  const generatedPreview = await renderPreviewHtml(
    previewSourcePath,
    implementationContract,
  );
  const generatedMarker = createGeneratedPreviewMarker(
    testPath.id,
    implementationContractText,
    previewSourceContent,
  );
  await writeText(
    manifest.preview_ref,
    `${generatedPreview}\n<!-- ${generatedMarker} -->\n`,
  );

  const previewContent = await readText(manifest.preview_ref);
  assertRenderablePreview(manifest.preview_ref, previewContent);

  const remoteRequests = new Set<string>();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  for (const colorScheme of AI_UI_E2E_VISUAL_COLOR_SCHEMES) {
    const context = await browser.newContext({
      colorScheme,
      viewport: {
        width: AI_UI_E2E_VISUAL_VIEWPORT.width,
        height: AI_UI_E2E_VISUAL_VIEWPORT.height,
      },
      deviceScaleFactor: AI_UI_E2E_VISUAL_VIEWPORT.deviceScaleFactor,
    });

    try {
      await context.route("http://**/*", async (route) => {
        remoteRequests.add(route.request().url());
        await route.abort("blockedbyclient");
      });
      await context.route("https://**/*", async (route) => {
        remoteRequests.add(route.request().url());
        await route.abort("blockedbyclient");
      });

      const page = await context.newPage();
      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(pathToFileURL(manifest.preview_ref).toString(), {
        waitUntil: "load",
      });
      await page.emulateMedia({
        colorScheme,
        reducedMotion: "reduce",
      });
      await page.addStyleTag({
        content: [
          "*, *::before, *::after {",
          "  animation: none !important;",
          "  transition: none !important;",
          "  scroll-behavior: auto !important;",
          "  caret-color: transparent !important;",
          "}",
        ].join("\n"),
      });
      await page.evaluate(async () => {
        await document.fonts?.ready;
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      });

      const isRenderable = await page.evaluate(() => {
        const body = document.body;
        if (!body) {
          return false;
        }

        const hasVisibleStructure =
          body.children.length > 0 || (body.textContent?.trim().length ?? 0) > 0;
        const bounds = body.getBoundingClientRect();
        return hasVisibleStructure && bounds.width > 0 && bounds.height > 0;
      });

      if (!isRenderable) {
        throw new Error(
          `Preview did not render usable content for ${pathId} in ${colorScheme} mode.`,
        );
      }

      const targetPath =
        colorScheme === "light"
          ? manifest.screenshots.desktop_light_ref
          : manifest.screenshots.desktop_dark_ref;
      await page.screenshot({
        path: targetPath,
        type: "png",
        animations: "disabled",
      });
    } finally {
      await context.close();
    }
  }

  if (remoteRequests.size > 0) {
    throw new Error(
      `preview.html attempted remote network requests for ${pathId}: ${[
        ...remoteRequests,
      ].join(", ")}`,
    );
  }

  if (pageErrors.length > 0) {
    throw new Error(
      `preview.html raised page errors for ${pathId}: ${pageErrors.join(" | ")}`,
    );
  }

  if (consoleErrors.length > 0) {
    throw new Error(
      `preview.html logged console errors for ${pathId}: ${consoleErrors.join(" | ")}`,
    );
  }

  await ensureExists(manifest.preview_ref);
  await ensureExists(manifest.screenshots.desktop_light_ref);
  await ensureExists(manifest.screenshots.desktop_dark_ref);

  manifest.completed = true;
  manifest.captured_at = new Date().toISOString();

  await writeJson(path.join(outputDirectory, pathId, "visual-manifest.json"), manifest);
}

async function main() {
  const outputDirectory = getOutputDirectory();
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    for (const testPath of getAiUiE2ePaths()) {
      await capturePathVisuals(browser, outputDirectory, testPath.id);
    }
  } finally {
    await browser.close();
  }

  process.stdout.write(
    `JudgmentKit AI UI E2E visuals written to ${outputDirectory}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit AI UI visual capture failed: ${message}\n`);
  process.exitCode = 1;
});
