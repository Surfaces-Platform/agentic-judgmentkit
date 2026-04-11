import { getPrompt, handleToolCall, listPrompts, listTools } from "@/lib/mcp";

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcId = JsonRpcRequest["id"];

export function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return {
    jsonrpc: "2.0" as const,
    id,
    result,
  };
}

export function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

export function getMcpMetadata(transport: "http" | "stdio") {
  return {
    name: "JudgmentKit Public MCP",
    version: "1.0.0",
    transport,
    capabilities: {
      tools: listTools(),
      prompts: listPrompts(),
    },
  };
}

export async function handleJsonRpcRequest(payload: JsonRpcRequest) {
  const { id = null, method = "", params = {} } = payload;

  switch (method) {
    case "initialize":
      return jsonRpcResult(id, {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "JudgmentKit Public MCP",
          version: "1.0.0",
        },
        capabilities: {
          tools: {},
          prompts: {},
        },
      });
    case "tools/list":
      return jsonRpcResult(id, {
        tools: listTools(),
      });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args =
        typeof params.arguments === "object" && params.arguments
          ? (params.arguments as Record<string, unknown>)
          : {};
      const result = await handleToolCall(name, args);
      if ("error" in result) {
        return jsonRpcError(id, -32000, result.error.message, result.error);
      }
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      });
    }
    case "prompts/list":
      return jsonRpcResult(id, {
        prompts: listPrompts(),
      });
    case "prompts/get": {
      const name = typeof params.name === "string" ? params.name : "";
      const args =
        typeof params.arguments === "object" && params.arguments
          ? (params.arguments as Record<string, unknown>)
          : {};
      const prompt = getPrompt(name, args);
      if ("error" in prompt) {
        return jsonRpcError(id, -32001, prompt.error.message, prompt.error);
      }
      return jsonRpcResult(id, {
        description: prompt.description,
        messages: [
          {
            role: "system",
            content: {
              type: "text",
              text: prompt.template,
            },
          },
        ],
      });
    }
    default:
      return jsonRpcError(id, -32601, `Method ${method} is not supported.`);
  }
}
