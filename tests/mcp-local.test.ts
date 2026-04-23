import { spawn } from "node:child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";

import { listTools } from "@/lib/mcp";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

async function waitForMetadata(url: string) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < 10_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Metadata returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

describe("local loopback MCP server", () => {
  it("serves metadata, Streamable HTTP tools/list, and local 404s", async () => {
    const port = 19_765 + Math.floor(Math.random() * 1_000);
    const endpoint = `http://127.0.0.1:${port}/mcp`;
    const root = `http://127.0.0.1:${port}/`;
    const stderrOutput: string[] = [];

    const child = spawn("npm", ["--prefix", process.cwd(), "run", "mcp:local"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JUDGMENTKIT_MCP_HOST: "127.0.0.1",
        JUDGMENTKIT_MCP_PORT: String(port),
      },
      stdio: ["ignore", "ignore", "pipe"],
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrOutput.push(chunk.toString());
    });

    try {
      await waitForMetadata(root);

      const rootMetadata = await fetch(root).then((response) => response.json());
      expect(rootMetadata.transport).toBe("local-loopback-http");

      const mcpMetadata = await fetch(endpoint, {
        headers: {
          accept: "application/json",
        },
      }).then((response) => response.json());
      expect(mcpMetadata.transport).toBe("local-loopback-http");

      const missing = await fetch(`http://127.0.0.1:${port}/wrong`);
      expect(missing.status).toBe(404);

      const transport = new StreamableHTTPClientTransport(new URL(endpoint));
      const client = new Client({
        name: "judgmentkit-local-loopback-test",
        version: "1.0.0",
      });

      try {
        await withTimeout(client.connect(transport), 5_000);
        const tools = await withTimeout(client.listTools(), 5_000);
        expect(tools.tools.map((tool) => tool.name)).toEqual(
          listTools().map((tool) => tool.name),
        );
      } finally {
        await transport.close();
      }
    } catch (error) {
      throw new Error(
        `Local loopback MCP test failed: ${String(error)}\n${stderrOutput.join("")}`,
      );
    } finally {
      child.kill();
    }
  });
});
