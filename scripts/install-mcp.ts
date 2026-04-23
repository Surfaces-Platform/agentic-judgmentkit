import {
  formatInstallerResult,
  installJudgmentKitMcp,
  InstallerError,
  parseInstallerArgs,
} from "@/lib/install-mcp";

async function main() {
  const options = parseInstallerArgs(process.argv.slice(2));
  const result = await installJudgmentKitMcp(options);
  process.stdout.write(formatInstallerResult(result));
}

main().catch((error) => {
  if (error instanceof InstallerError) {
    process.stderr.write(`JudgmentKit installer failed during ${error.phase}: ${error.message}\n`);
    if (error.manualSnippet) {
      process.stderr.write(`Manual config snippet:\n${error.manualSnippet}\n`);
    }
    process.exit(1);
  }

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`JudgmentKit installer failed: ${message}\n`);
  process.exit(1);
});
