export default async function globalSetup() {
  process.env.JUDGMENTKIT_SITE_URL = "https://judgmentkit.ai";

  const { writeGeneratedArtifacts } = await import("@/lib/site");
  await writeGeneratedArtifacts();
}
