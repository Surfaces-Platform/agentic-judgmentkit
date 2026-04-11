import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createJudgmentKitMcpServer } from "@/lib/mcp-server";
import { writeGeneratedArtifacts } from "@/lib/site";

async function main() {
  await writeGeneratedArtifacts();
  const server = createJudgmentKitMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit stdio MCP failed: ${message}\n`);
  process.exit(1);
});
