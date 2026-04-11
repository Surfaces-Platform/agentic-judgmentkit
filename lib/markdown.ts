import matter from "gray-matter";
import GithubSlugger from "github-slugger";

import type { DocFrontmatter, Heading } from "@/lib/types";

export function extractHeadings(source: string): Heading[] {
  const slugger = new GithubSlugger();
  const matches = source.matchAll(/^(#{2,6})\s+(.+)$/gm);

  return [...matches].map((match) => ({
    level: match[1].length,
    text: match[2].trim(),
    id: slugger.slug(match[2].trim()),
  }));
}

export function stripMdxArtifacts(source: string) {
  return source
    .replace(/^import\s.+$/gm, "")
    .replace(/<[^>\n]+\/>/g, "")
    .replace(/<\/?[A-Z][^>\n]*>/g, "")
    .trim();
}

export function createMirrorContent(
  frontmatter: DocFrontmatter,
  body: string,
  headings: Heading[],
) {
  const metadata = {
    title: frontmatter.title,
    summary: frontmatter.summary,
    agent_summary: frontmatter.agent_summary,
    canonical_url: frontmatter.slug,
    page_type: frontmatter.page_type,
    related_resources: frontmatter.related_resources,
    related_schemas: frontmatter.related_schemas,
    last_reviewed: frontmatter.last_reviewed,
  };

  const cleaned = stripMdxArtifacts(body);
  const related = [
    frontmatter.related_pages.length
      ? `## Related pages\n${frontmatter.related_pages.map((page) => `- ${page}`).join("\n")}`
      : "",
    frontmatter.related_resources.length
      ? `## Related resources\n${frontmatter.related_resources
          .map((resource) => `- ${resource}`)
          .join("\n")}`
      : "",
    frontmatter.related_schemas.length
      ? `## Related schemas\n${frontmatter.related_schemas
          .map((schema) => `- ${schema}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const headingList = headings.length
    ? `## Headings\n${headings.map((heading) => `- ${"#".repeat(heading.level)} ${heading.text}`).join("\n")}\n\n`
    : "";

  return matter.stringify(
    `# ${frontmatter.title}

${frontmatter.summary}

> Agent summary: ${frontmatter.agent_summary}

${headingList}${cleaned}

${related}
`,
    metadata,
  );
}
