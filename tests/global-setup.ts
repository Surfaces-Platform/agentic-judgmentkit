import { writeGeneratedArtifacts } from "@/lib/site";

export default async function globalSetup() {
  await writeGeneratedArtifacts();
}
