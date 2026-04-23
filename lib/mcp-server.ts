import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { getPrompt, handleToolCall, listPrompts, listTools } from "@/lib/mcp";

const MCP_SERVER_NAME = "JudgmentKit Public MCP";
const MCP_SERVER_VERSION = "1.0.0";

const TOOL_DEFINITIONS = Object.fromEntries(
  listTools().map((tool) => [tool.name, tool]),
);

const PROMPT_DEFINITIONS = Object.fromEntries(
  listPrompts().map((prompt) => [prompt.name, prompt]),
);

function createToolResult(result: Awaited<ReturnType<typeof handleToolCall>>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
    isError: "error" in result ? true : undefined,
  };
}

function createPromptResult(name: string, args: Record<string, unknown> = {}) {
  const prompt = getPrompt(name, args);

  if ("error" in prompt) {
    throw new Error(prompt.error.message);
  }

  return {
    description: prompt.description,
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: prompt.template,
        },
      },
    ],
  };
}

export function createJudgmentKitMcpServer() {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  server.registerTool(
    "list_resources",
    {
      description: TOOL_DEFINITIONS.list_resources.description,
      inputSchema: {
        type: z.string().optional(),
        workflow_id: z.string().optional(),
        guardrail_id: z.string().optional(),
        tag: z.string().optional(),
        page_type: z.string().optional(),
      },
    },
    async (args) => createToolResult(await handleToolCall("list_resources", args)),
  );

  server.registerTool(
    "get_resource",
    {
      description: TOOL_DEFINITIONS.get_resource.description,
      inputSchema: {
        id: z.string(),
        version: z.string().optional(),
      },
    },
    async (args) => createToolResult(await handleToolCall("get_resource", args)),
  );

  server.registerTool(
    "get_workflow_bundle",
    {
      description: TOOL_DEFINITIONS.get_workflow_bundle.description,
      inputSchema: {
        workflow_id: z.string(),
        feature_intent: z.string().optional(),
      },
    },
    async (args) => createToolResult(await handleToolCall("get_workflow_bundle", args)),
  );

  server.registerTool(
    "get_page_markdown",
    {
      description: TOOL_DEFINITIONS.get_page_markdown.description,
      inputSchema: {
        slug: z.string(),
      },
    },
    async (args) => createToolResult(await handleToolCall("get_page_markdown", args)),
  );

  server.registerTool(
    "get_example",
    {
      description: TOOL_DEFINITIONS.get_example.description,
      inputSchema: {
        id: z.string(),
      },
    },
    async (args) => createToolResult(await handleToolCall("get_example", args)),
  );

  server.registerTool(
    "resolve_related",
    {
      description: TOOL_DEFINITIONS.resolve_related.description,
      inputSchema: {
        id: z.string(),
      },
    },
    async (args) => createToolResult(await handleToolCall("resolve_related", args)),
  );

  server.registerPrompt(
    "explain_guardrail",
    {
      description: PROMPT_DEFINITIONS.explain_guardrail.description,
      argsSchema: {
        resource_id: z.string().optional(),
      },
    },
    async (args) => createPromptResult("explain_guardrail", args),
  );

  server.registerPrompt(
    "apply_guardrail_to_draft",
    {
      description: PROMPT_DEFINITIONS.apply_guardrail_to_draft.description,
      argsSchema: {
        resource_id: z.string().optional(),
        draft: z.string().optional(),
      },
    },
    async (args) => createPromptResult("apply_guardrail_to_draft", args),
  );

  server.registerPrompt(
    "summarize_example_incident",
    {
      description: PROMPT_DEFINITIONS.summarize_example_incident.description,
      argsSchema: {
        resource_id: z.string().optional(),
      },
    },
    async (args) => createPromptResult("summarize_example_incident", args),
  );

  server.registerPrompt(
    "start_design_workflow",
    {
      description: PROMPT_DEFINITIONS.start_design_workflow.description,
      argsSchema: {
        feature_intent: z.string().optional(),
      },
    },
    async (args) => createPromptResult("start_design_workflow", args),
  );

  server.registerPrompt(
    "start_no_design_system_workflow",
    {
      description: PROMPT_DEFINITIONS.start_no_design_system_workflow.description,
      argsSchema: {
        feature_intent: z.string().optional(),
      },
    },
    async (args) => createPromptResult("start_no_design_system_workflow", args),
  );

  server.registerPrompt(
    "refine_design_first_pass",
    {
      description: PROMPT_DEFINITIONS.refine_design_first_pass.description,
      argsSchema: {
        feature_intent: z.string(),
        draft: z.string(),
        refinement_goal: z.string(),
        must_keep: z.string().optional(),
        known_issues: z.string().optional(),
      },
    },
    async (args) => createPromptResult("refine_design_first_pass", args),
  );

  return server;
}

export function getMcpMetadata(
  transport: "stdio" | "streamable-http" | "local-loopback-http",
) {
  return {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    transport,
    capabilities: {
      tools: listTools(),
      prompts: listPrompts(),
    },
  };
}
