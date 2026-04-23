import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  createMcpMetadataResponse,
  createMcpNotFoundResponse,
  handleMcpHttpRequest,
} from "@/lib/mcp-http";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8765;
const MCP_ENDPOINT = "/mcp";

function resolveHost() {
  return process.env.JUDGMENTKIT_MCP_HOST?.trim() || DEFAULT_HOST;
}

function resolvePort() {
  const value = process.env.JUDGMENTKIT_MCP_PORT ?? process.env.PORT;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function createRequest(req: IncomingMessage, origin: string) {
  const url = new URL(req.url || MCP_ENDPOINT, origin);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
  };

  if (!["GET", "HEAD"].includes(req.method ?? "GET")) {
    init.body = req as unknown as BodyInit;
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

async function handleNodeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  origin: string,
) {
  const request = createRequest(req, origin);
  const pathname = new URL(request.url).pathname;

  if (pathname === "/" && request.method === "GET") {
    await sendResponse(
      res,
      createMcpMetadataResponse("local-loopback-http", { cors: true }),
    );
    return;
  }

  if (pathname !== MCP_ENDPOINT) {
    await sendResponse(res, createMcpNotFoundResponse());
    return;
  }

  if (!["GET", "POST", "OPTIONS"].includes(request.method)) {
    await sendResponse(res, createMcpNotFoundResponse("Use GET or POST /mcp."));
    return;
  }

  const response = await handleMcpHttpRequest(request, {
    metadataTransport: "local-loopback-http",
    cors: true,
    allowOptions: true,
  });
  await sendResponse(res, response);
}

const host = resolveHost();
const port = resolvePort();
const origin = `http://${host}:${port}`;

const server = createServer((req, res) => {
  handleNodeRequest(req, res, origin).catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown local MCP error.";
    sendResponse(
      res,
      new Response(
        JSON.stringify({
          error: "internal_error",
          message,
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        },
      ),
    ).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
});

server.listen(port, host, () => {
  process.stdout.write(
    `JudgmentKit local MCP listening at ${origin}${MCP_ENDPOINT}\n`,
  );
});
