import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createJudgmentKitMcpServer, getMcpMetadata } from "@/lib/mcp-server";

type McpHttpMetadataTransport = "streamable-http" | "local-loopback-http";

const LOCAL_CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers":
    "content-type, accept, mcp-protocol-version, mcp-session-id",
} as const;

function wantsSse(request: Request) {
  return request.headers.get("accept")?.includes("text/event-stream") ?? false;
}

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(LOCAL_CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export function createMcpMetadataResponse(
  transport: McpHttpMetadataTransport,
  options: { cors?: boolean } = {},
) {
  const response = jsonResponse(getMcpMetadata(transport));
  return options.cors ? withCors(response) : response;
}

export function createMcpOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: LOCAL_CORS_HEADERS,
  });
}

export function createMcpNotFoundResponse(message = "Use /mcp.") {
  return withCors(
    jsonResponse(
      {
        error: "not_found",
        message,
      },
      { status: 404 },
    ),
  );
}

export async function handleStreamableMcpRequest(
  request: Request,
  options: { cors?: boolean } = {},
) {
  const server = createJudgmentKitMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  return options.cors ? withCors(response) : response;
}

export async function handleMcpHttpRequest(
  request: Request,
  options: {
    metadataTransport?: McpHttpMetadataTransport;
    cors?: boolean;
    allowOptions?: boolean;
  } = {},
) {
  if (request.method === "OPTIONS" && options.allowOptions) {
    return createMcpOptionsResponse();
  }

  if (request.method === "GET" && !wantsSse(request)) {
    return createMcpMetadataResponse(
      options.metadataTransport ?? "streamable-http",
      { cors: options.cors },
    );
  }

  return handleStreamableMcpRequest(request, { cors: options.cors });
}
