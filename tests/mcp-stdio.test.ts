import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: Record<string, unknown>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

function encodeMessage(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function createMessageReader(child: ChildProcessWithoutNullStreams) {
  let buffer = Buffer.alloc(0);
  const queue: JsonRpcResponse[] = [];
  const waiters: Array<(message: JsonRpcResponse) => void> = [];

  child.stdout.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const headerEndIndex = buffer.indexOf("\r\n\r\n");
      if (headerEndIndex === -1) {
        return;
      }

      const headerBlock = buffer.subarray(0, headerEndIndex).toString("utf8");
      const contentLengthMatch = headerBlock.match(
        /(?:^|\r\n)Content-Length:\s*(\d+)\s*(?:\r\n|$)/i,
      );

      if (!contentLengthMatch) {
        throw new Error("Missing Content-Length header in stdio response.");
      }

      const contentLength = Number(contentLengthMatch[1]);
      const messageStartIndex = headerEndIndex + 4;
      const messageEndIndex = messageStartIndex + contentLength;

      if (buffer.length < messageEndIndex) {
        return;
      }

      const message = JSON.parse(
        buffer.subarray(messageStartIndex, messageEndIndex).toString("utf8"),
      ) as JsonRpcResponse;
      buffer = buffer.subarray(messageEndIndex);

      const resolve = waiters.shift();
      if (resolve) {
        resolve(message);
      } else {
        queue.push(message);
      }
    }
  });

  return async function readMessage() {
    if (queue.length > 0) {
      return queue.shift() as JsonRpcResponse;
    }

    return await new Promise<JsonRpcResponse>((resolve) => {
      waiters.push(resolve);
    });
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
    }),
  ]);
}

describe("stdio mcp server", () => {
  let child: ChildProcessWithoutNullStreams | undefined;

  afterEach(() => {
    child?.kill();
    child = undefined;
  });

  it("responds to initialize and prompts/get over stdio", async () => {
    const cliPath = path.join(
      process.cwd(),
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs",
    );
    const scriptPath = path.join(process.cwd(), "scripts", "judgmentkit-mcp-stdio.ts");

    child = spawn(process.execPath, [cliPath, scriptPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const readMessage = createMessageReader(child);

    child.stdin.write(
      encodeMessage({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      }),
    );

    const initializeResponse = await withTimeout(readMessage(), 5_000);
    expect(initializeResponse.error).toBeUndefined();
    expect(initializeResponse.result?.protocolVersion).toBe("2024-11-05");

    child.stdin.write(
      encodeMessage({
        jsonrpc: "2.0",
        id: 2,
        method: "prompts/get",
        params: {
          name: "refine_design_first_pass",
          arguments: {
            feature_intent: "Refine the JudgmentKit.com landing page",
            draft: "Hero, install rail, proof section, inspect links in the body.",
            refinement_goal: "clarity and first-time usability",
          },
        },
      }),
    );

    const promptResponse = await withTimeout(readMessage(), 5_000);
    expect(promptResponse.error).toBeUndefined();

    const messages = promptResponse.result?.messages as Array<{
      content: { text: string };
    }>;
    expect(messages[0].content.text).toContain(
      "Refine the JudgmentKit.com landing page",
    );
    expect(messages[0].content.text).toContain(
      'get_workflow_bundle({ workflow_id: "workflow.ai-ui-generation", feature_intent: "Refine the JudgmentKit.com landing page" })',
    );
    expect(messages[0].content.text).toContain(
      "accessibility baseline or owner-approved review status",
    );
    expect(messages[0].content.text).toContain(
      "review_checklist",
    );
  });
});
