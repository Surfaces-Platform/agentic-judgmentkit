import { handleJsonRpcRequest, jsonRpcError, type JsonRpcRequest } from "@/lib/mcp-jsonrpc";
import { writeGeneratedArtifacts } from "@/lib/site";

const HEADER_SEPARATOR = "\r\n\r\n";

function writeMessage(message: unknown) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  process.stdout.write(
    `Content-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n`,
  );
  process.stdout.write(body);
}

function parseNextMessage(buffer: Buffer) {
  const headerEndIndex = buffer.indexOf(HEADER_SEPARATOR);
  if (headerEndIndex === -1) {
    return null;
  }

  const headerBlock = buffer.subarray(0, headerEndIndex).toString("utf8");
  const contentLengthMatch = headerBlock.match(/(?:^|\r\n)Content-Length:\s*(\d+)\s*(?:\r\n|$)/i);

  if (!contentLengthMatch) {
    throw new Error("Missing Content-Length header in MCP stdio message.");
  }

  const contentLength = Number(contentLengthMatch[1]);
  const messageStartIndex = headerEndIndex + HEADER_SEPARATOR.length;
  const messageEndIndex = messageStartIndex + contentLength;

  if (buffer.length < messageEndIndex) {
    return null;
  }

  return {
    raw: buffer.subarray(messageStartIndex, messageEndIndex).toString("utf8"),
    rest: Buffer.from(buffer.subarray(messageEndIndex)),
  };
}

async function handleRawMessage(raw: string) {
  let payload: JsonRpcRequest;

  try {
    payload = JSON.parse(raw) as JsonRpcRequest;
  } catch {
    writeMessage(jsonRpcError(null, -32700, "Invalid JSON payload."));
    return;
  }

  writeMessage(await handleJsonRpcRequest(payload));
}

async function main() {
  await writeGeneratedArtifacts();

  let buffer: Buffer = Buffer.alloc(0);

  for await (const chunk of process.stdin) {
    buffer = Buffer.concat([
      buffer,
      Buffer.from(chunk),
    ]);

    while (true) {
      const parsed = parseNextMessage(buffer);
      if (!parsed) {
        break;
      }

      buffer = parsed.rest;
      await handleRawMessage(parsed.raw);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit stdio MCP failed: ${message}\n`);
  process.exit(1);
});
