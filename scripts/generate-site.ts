import { writeGeneratedArtifacts } from "@/lib/site";

async function main() {
  const site = await writeGeneratedArtifacts();
  process.stdout.write(
    `Generated ${site.pages.length} docs pages, ${site.resourceIndex.resources.length} resources, and ${site.resourceIndex.schemas.length} schemas.\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
