import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse } from "next/server";

import { createJudgmentKitMcpServer, getMcpMetadata } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsSse(request: Request) {
  return request.headers.get("accept")?.includes("text/event-stream") ?? false;
}

async function handleStreamableHttpRequest(request: Request) {
  const server = createJudgmentKitMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request: Request) {
  if (!wantsSse(request)) {
    return NextResponse.json(getMcpMetadata("streamable-http"));
  }

  return handleStreamableHttpRequest(request);
}

export async function POST(request: Request) {
  return handleStreamableHttpRequest(request);
}

export async function DELETE(request: Request) {
  return handleStreamableHttpRequest(request);
}
