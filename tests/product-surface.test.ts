import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  InspectSurface,
  formatInspectJsonText,
  resolveInspectResourceIdFromHash,
} from "@/components/inspect-surface";
import {
  ReferenceSurface,
  formatReferenceSourceText,
} from "@/components/reference-surface";
import {
  CANONICAL_INSTALL_MANIFEST_URL,
  HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND,
  JUDGMENTKIT_REPOSITORY_CLONE_URL,
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
  LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
  LOCAL_JUDGMENTKIT_STDIO_ARGS,
} from "@/lib/constants";
import { listPrompts, listTools } from "@/lib/mcp";
import { loadInstallContract, loadProductSurface } from "@/lib/product-surface";
import rawExampleArtifact from "@/public/resources/examples/ui-generation-drift.v1.json";

describe("product surface content", () => {
  it("defines stdio install targets and the derived loaded context", () => {
    const content = loadProductSurface();

    expect(content.install_targets.map((target) => target.id)).toEqual([
      "codex",
      "claude",
      "cursor",
    ]);
    expect(content.install_targets[0]).toMatchObject({
      config_path: "~/.codex/config.toml",
    });
    expect(content.install_targets[1]).toMatchObject({
      config_path: ".mcp.json",
    });
    expect(content.install_targets[2]).toMatchObject({
      config_path: "~/.cursor/mcp.json",
    });
    expect(content.install_targets[0]).not.toHaveProperty("config_snippet");
    expect(content.install_targets[0]).not.toHaveProperty("install_note");
    expect(content.install_targets[0]).not.toHaveProperty("connection_value");
    expect(content.install_contract.supported_clients).toEqual([
      "codex",
      "claude",
      "cursor",
    ]);
    expect(content.loaded_context.map((item) => item.id)).toEqual([
      "workflow.ai-ui-generation",
      "guardrail.design-system-integrity",
      "guardrail.ui-copy-clarity",
      "guardrail.control-proximity",
      "guardrail.surface-theme-parity",
      "guardrail.runtime-cost",
      "guardrail.provenance-escalation",
      "example.ui-generation.component-drift",
      "example.ui-generation.embellishment-drift",
      "example.ui-generation.onboarding-clarity-drift",
      "example.ui-generation.repetitive-copy-drift",
      "example.ui-generation.control-proximity-drift",
      "example.ui-generation.surface-theme-parity-drift",
    ]);
  });

  it("derives bootstrap-only install and verify prompts", () => {
    const content = loadProductSurface();

    expect(content.install_command).toBe(HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND);
    expect(content.verify_prompt).toBe(
      "Call MCP tools/list against the local judgmentkit server",
    );
  });

  it("builds a canonical /install.json manifest for agents", () => {
    const contract = loadInstallContract();

    expect(contract.version).toBe("3.0.0");
    expect(contract.manifest_url).toBe(CANONICAL_INSTALL_MANIFEST_URL);
    expect(contract.command_reference_url).toBe("https://judgmentkit.ai/inspect#commands");
    expect(contract.installer.bootstrap_url).toBe("https://judgmentkit.ai/install");
    expect(contract.installer.local_script_command).toBe(
      LOCAL_JUDGMENTKIT_INSTALLER_COMMAND,
    );
    expect(contract.repository).toEqual({
      clone_url: JUDGMENTKIT_REPOSITORY_CLONE_URL,
      local_path_placeholder: LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
      install_command: LOCAL_JUDGMENTKIT_INSTALL_COMMAND,
    });
    expect(contract.connection).toEqual({
      command: "npm",
      args: LOCAL_JUDGMENTKIT_STDIO_ARGS,
    });
    expect(contract.supported_clients).toEqual(["codex", "claude", "cursor"]);
    expect(contract.clients).toEqual([
      {
        id: "codex",
        label: "Codex",
        config_path: "~/.codex/config.toml",
        config_format: "toml",
      },
      {
        id: "claude",
        label: "Claude",
        config_path: ".mcp.json",
        config_format: "json",
      },
      {
        id: "cursor",
        label: "Cursor",
        config_path: "~/.cursor/mcp.json",
        config_format: "json",
      },
    ]);
    expect(contract.clients[0]).not.toHaveProperty("config_snippet");
    expect(contract.clients[0]).not.toHaveProperty("install_note");
    expect(contract.clients[0]).not.toHaveProperty("transport");
    expect(contract.verification.method).toBe("tools/list");
    expect(contract.verification.server_name).toBe("judgmentkit");
    expect(contract.verification.instructions).toContain("tools/list");
    expect(contract.verification.expected_tools).toEqual(
      listTools().map((tool) => tool.name),
    );
    expect(contract.verification.expected_prompts).toEqual(
      listPrompts().map((prompt) => prompt.name),
    );
    expect(contract.verification.tool_reference).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "get_workflow_bundle",
          docs_url: "https://judgmentkit.ai/inspect#tool-get_workflow_bundle",
        }),
      ]),
    );
    expect(contract.verification.prompt_reference).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "start_design_workflow",
          docs_url: "https://judgmentkit.ai/inspect#prompt-start_design_workflow",
        }),
      ]),
    );
  });

  it("keeps the raw artifact references available for the inspect route", () => {
    const content = loadProductSurface();
    const urls = content.inspect_reference_items.map((item) => item.url);

    expect(content.inspect).toEqual({
      href: "/reference",
      label: "Open JudgmentKit reference",
      description:
        "Use the install script, install manifest, command anchors, published artifacts, and hosted debug surfaces when you need to verify what is deployed or inspect the machine-facing materials outside the inline browser.",
    });
    expect(urls).toContain("/install");
    expect(urls).toContain("/install.json");
    expect(urls).toContain("/mcp");
    expect(urls).toContain("/mcp-inventory.json");
    expect(urls).toContain("/llms.txt");
    expect(urls).toContain("/resources/index.json");
    expect(urls).toContain("/resources/workflows/ai-ui-generation.v1.json");
    expect(urls).toContain("/docs/workflows/ai-ui-generation.md");
    expect(urls).toContain("/schemas/workflow.schema.json");
  });

  it("builds human-facing inspect items and secondary reference files", () => {
    const content = loadProductSurface();
    const workflowItem = content.inspect_primary_items.find(
      (item) => item.id === "workflow.ai-ui-generation",
    );
    const guardrailItem = content.inspect_primary_items.find(
      (item) => item.id === "guardrail.design-system-integrity",
    );
    const exampleItem = content.inspect_primary_items.find(
      (item) => item.id === "example.ui-generation.embellishment-drift",
    );
    const installScriptItem = content.inspect_reference_items.find((item) => item.url === "/install");
    const installManifestItem = content.inspect_reference_items.find(
      (item) => item.url === "/install.json",
    );

    expect(content.inspect_primary_items[0]?.id).toBe(
      "example.ui-generation.embellishment-drift",
    );
    expect(workflowItem).toMatchObject({
      category: "Workflows",
      available_view_modes: ["prompt", "json", "schema"],
      default_view_mode: "prompt",
    });
    expect(workflowItem?.prompt_text).toContain('Use JudgmentKit workflow "AI UI generation"');
    expect(workflowItem?.prompt_text).toContain("Task:");
    expect(guardrailItem?.prompt_text).toContain("Apply JudgmentKit guardrail");
    expect(guardrailItem?.prompt_text).toContain("Draft:");
    expect(exampleItem?.prompt_text).toContain("Use JudgmentKit example");
    expect(exampleItem?.prompt_text).toContain("Task:");
    expect(installScriptItem).toMatchObject({
      group: "Install and discovery",
      type: "script",
      raw_format: "text",
    });
    expect(installScriptItem?.summary).toContain("hosted bootstrap script");
    expect(installManifestItem).toMatchObject({
      group: "Install and discovery",
      type: "install",
      raw_format: "json",
    });
    expect(installManifestItem?.summary).toContain("machine-readable bootstrap manifest");
  });

  it("sources the proof from the published example artifact", () => {
    const content = loadProductSurface();

    expect(content.proof.example_id).toBe(rawExampleArtifact.id);
    expect(content.proof.workflow_id).toBe(rawExampleArtifact.workflow_id);
    expect(content.proof.brief_text).toBe(rawExampleArtifact.scenario);
    expect(content.proof.uncontrolled_text).toBe(rawExampleArtifact.raw_output);
    expect(content.proof.guided_text).toBe(rawExampleArtifact.corrected_output);
  });

  it("renders the get started inspect surface without the lower reference section", () => {
    const content = loadProductSurface();
    const markup = renderToStaticMarkup(
      createElement(InspectSurface, { content }),
    );

    expect(markup).toContain("inspect-browser-shell");
    expect(markup).toContain(">Examples<");
    expect(markup).toContain(">Workflows<");
    expect(markup).toContain(">Guardrails<");
    expect(markup).toContain("Use JudgmentKit example");
    expect(markup).toContain("inspect-viewer-toolbar");
    expect(markup).toContain(">Prompt<");
    expect(markup).toContain(">JSON<");
    expect(markup).toContain(">Schema<");
    expect(markup).toContain('aria-label="Open inspect navigation"');
    expect(markup).toContain('aria-controls="inspect-resource-rail"');
    expect(markup).toContain('id="inspect-resource-rail"');
    expect(markup).toContain("fixed bottom-0 left-0 top-[4.75rem] z-50");
    expect(markup).toContain("w-[min(18rem,calc(100vw-2rem))]");
    expect(markup).toContain("-translate-x-full");
    expect(markup).toContain("fixed inset-x-0 bottom-0 top-[4.75rem] z-40");
    expect(markup).toContain("h-full w-full overflow-hidden");
    expect(markup).toContain("surface-panel inspect-browser-shell h-full overflow-hidden");
    expect(markup).toContain("md:rounded-none");
    expect(markup).toContain("md:border-x-0");
    expect(markup).toContain("md:border-t-0");
    expect(markup).toContain("md:grid-cols-[17rem,minmax(0,1fr)]");
    expect(markup).toContain("lg:grid-cols-[19rem,minmax(0,1fr)]");
    expect(markup).toContain('id="resource-workflow.ai-ui-generation"');
    expect(markup).not.toContain("Open raw JSON");
    expect(markup).not.toContain("Contact");
    expect(markup).not.toContain("Human-facing inspection");
    expect(markup).not.toContain("Start with examples, then open the workflow and guardrails.");
    expect(markup).not.toContain("What to prompt");
    expect(markup).not.toContain("Reference");
    expect(markup).not.toContain("Published artifacts and command anchors");
    expect(markup).not.toContain("Implementation reference");
    expect(markup).not.toContain("Install manifest");
    expect(markup).not.toContain("Command inventory");
    expect(markup.indexOf(">Examples<")).toBeLessThan(markup.indexOf(">Workflows<"));
    expect(markup.indexOf(">Examples<")).toBeLessThan(markup.indexOf(">Guardrails<"));
    expect(markup.indexOf("Zero-shot UI generation rewritten to design-system-first restrained output")).toBeLessThan(
      markup.indexOf("Landing page first pass rewritten for clearer onboarding"),
    );
    expect(markup.indexOf("Landing page first pass rewritten for clearer onboarding")).toBeLessThan(
      markup.indexOf("Repetitive UI copy rewritten into distinct control language"),
    );
    expect(markup.indexOf("Repetitive UI copy rewritten into distinct control language")).toBeLessThan(
      markup.indexOf("UI generation request rewritten to system-safe output"),
    );
    expect(markup.indexOf(">Prompt<")).toBeLessThan(markup.indexOf(">JSON<"));
    expect(markup.indexOf(">JSON<")).toBeLessThan(markup.indexOf(">Schema<"));
  });

  it("renders the reference surface on its own page", () => {
    const content = loadProductSurface();
    const markup = renderToStaticMarkup(createElement(ReferenceSurface, { content }));

    expect(markup).toContain("Reference");
    expect(markup).toContain("Published artifacts and command anchors");
    expect(markup).toContain('placeholder="Search reference"');
    expect(markup).toContain("Implementation reference");
    expect(markup).toContain("Install script");
    expect(markup).toContain("Install manifest");
    expect(markup).toContain("Command inventory");
    expect(markup).toContain("get_workflow_bundle");
    expect(markup).toContain("start_design_workflow");
    expect(markup).toContain('id="commands"');
    expect(markup).toContain('id="tool-get_workflow_bundle"');
    expect(markup).toContain('id="prompt-start_design_workflow"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain(">View source<");
    expect(markup).toContain("/inspect#tool-get_workflow_bundle");
    expect(markup).not.toContain("Reference preview");
    expect(markup).not.toContain(">Open link<");
    expect(markup).not.toContain("New tab");
  });

  it("resolves inspect resources from legacy hash anchors", () => {
    const content = loadProductSurface();

    expect(
      resolveInspectResourceIdFromHash(
        "#resource-workflow.ai-ui-generation",
        content.inspect_primary_items,
      ),
    ).toBe("workflow.ai-ui-generation");
    expect(
      resolveInspectResourceIdFromHash(
        "#resource-missing",
        content.inspect_primary_items,
      ),
    ).toBe(content.inspect_primary_items[0].id);
  });

  it("formats fetched JSON for the inline viewer", () => {
    expect(formatInspectJsonText('{"id":"workflow.ai-ui-generation","version":1}')).toBe(
      '{\n  "id": "workflow.ai-ui-generation",\n  "version": 1\n}\n',
    );
  });

  it("pretty prints reference JSON by default and preserves raw mode", () => {
    expect(formatReferenceSourceText('{"id":"workflow.ai-ui-generation","version":1}', "json", true)).toBe(
      '{\n  "id": "workflow.ai-ui-generation",\n  "version": 1\n}\n',
    );
    expect(formatReferenceSourceText('{"id":"workflow.ai-ui-generation","version":1}', "json", false)).toBe(
      '{"id":"workflow.ai-ui-generation","version":1}\n',
    );
  });
});
