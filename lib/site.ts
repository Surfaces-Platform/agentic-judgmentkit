import fs from "node:fs/promises";
import path from "node:path";

import {
  CHANGELOG_DIR,
  PUBLIC_CHANGELOG_PATH,
  PUBLIC_DOCS_DIR,
  PUBLIC_GRAPH_PATH,
  PUBLIC_LLMS_PATH,
  PUBLIC_MCP_INVENTORY_PATH,
  PUBLIC_RESOURCE_INDEX_PATH,
  PUBLIC_RESOURCES_DIR,
  PUBLIC_SCHEMAS_DIR,
  PUBLIC_SEARCH_PATH,
  RESOURCES_DIR,
  ROOT_URL,
  SCHEMAS_DIR,
} from "@/lib/constants";
import { loadChangelogEntries, loadDocPages, loadResources, loadSchemas } from "@/lib/content";
import { createMirrorContent } from "@/lib/markdown";
import type {
  ChangelogEntry,
  DocPage,
  GraphNode,
  ResourceIndex,
  ResourceIndexEntry,
  SchemaIndexEntry,
  SearchDocument,
} from "@/lib/types";
import { createAjv, formatAjvErrors } from "@/lib/validation";
import {
  absoluteUrl,
  ensureDirectory,
  resetDirectory,
  rewriteInternalSiteUrls,
  sha256,
  unique,
} from "@/lib/utils";

type LoadedResource = Awaited<ReturnType<typeof loadResources>>[number];
type LoadedSchema = Awaited<ReturnType<typeof loadSchemas>>[number];

function getResourcePublicPath(filePath: string) {
  const relative = path.relative(RESOURCES_DIR, filePath).replaceAll(path.sep, "/");
  return `/resources/${relative}`;
}

function getSchemaPublicPath(filePath: string) {
  const relative = path.relative(SCHEMAS_DIR, filePath).replaceAll(path.sep, "/");
  return `/schemas/${relative}`;
}

function getInspectResourceAnchor(id: string) {
  return `${ROOT_URL}/inspect#resource-${id}`;
}

function collectResourceTags(resource: Record<string, unknown>) {
  const tags = [
    ...(Array.isArray(resource.audiences) ? resource.audiences : []),
    ...(Array.isArray(resource.guardrail_ids) ? resource.guardrail_ids : []),
    ...(Array.isArray(resource.common_guardrails) ? resource.common_guardrails : []),
    ...(Array.isArray(resource.workflows) ? resource.workflows : []),
  ]
    .map((value) => String(value))
    .filter(Boolean);

  if (typeof resource.id === "string") {
    tags.push(resource.id);
  }
  if (typeof resource.type === "string") {
    tags.push(resource.type);
  }

  return unique(tags);
}

function createSearchDocumentForDoc(page: DocPage): SearchDocument {
  return {
    id: page.slug,
    kind: "doc",
    title: page.frontmatter.title,
    summary: page.frontmatter.summary,
    url: page.slug,
    pageType: page.frontmatter.page_type,
    audiences: page.frontmatter.audiences,
    workflowIds: page.frontmatter.workflows,
    guardrailIds: page.frontmatter.guardrails,
    headings: page.headings.map((heading) => heading.text),
    searchText: [
      page.frontmatter.title,
      page.frontmatter.summary,
      page.frontmatter.agent_summary,
      page.body,
      page.headings.map((heading) => heading.text).join(" "),
      page.frontmatter.audiences.join(" "),
      (page.frontmatter.workflows ?? []).join(" "),
      (page.frontmatter.guardrails ?? []).join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

function createSearchDocumentForResource(entry: ResourceIndexEntry): SearchDocument {
  return {
    id: entry.id,
    kind: "resource",
    title: entry.title,
    summary: entry.summary,
    url: entry.url.replace(ROOT_URL, ""),
    tags: entry.tags,
    searchText: [
      entry.id,
      entry.title,
      entry.summary,
      entry.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

function createGraph(pages: DocPage[], resourceIndex: ResourceIndex): GraphNode[] {
  const docNodes = pages.map((page) => ({
    id: page.slug,
    type: "doc" as const,
    url: page.slug,
    title: page.frontmatter.title,
    related: unique([
      ...page.frontmatter.related_pages,
      ...page.frontmatter.related_resources,
      ...page.frontmatter.related_schemas,
      ...(page.frontmatter.workflows ?? []),
      ...(page.frontmatter.guardrails ?? []),
    ]),
  }));

  const resourceNodes = resourceIndex.resources.map((entry) => ({
    id: entry.id,
    type: "resource" as const,
    url: entry.url.replace(ROOT_URL, ""),
    title: entry.title,
    related: unique(entry.tags),
  }));

  return [...docNodes, ...resourceNodes];
}

function createLlmsText(pages: DocPage[], resourceIndex: ResourceIndex) {
  const pageUrl = (slug: string) => `${ROOT_URL}${slug}.md`;
  const docsBySlug = new Map(pages.map((page) => [page.slug, page]));
  const startHere = [
    "/docs/start/what-is-judgmentkit",
    "/docs/start/why-ai-decisions-drift",
    "/docs/start/pilot-one-workflow-in-a-week",
  ]
    .filter((slug) => docsBySlug.has(slug))
    .map(pageUrl);
  const workflowPages = [
    "/docs/workflows/support-assistant",
    "/docs/workflows/ai-ui-generation",
  ]
    .filter((slug) => docsBySlug.has(slug))
    .map(pageUrl);
  const guardrailPages = pages
    .filter((page) => page.frontmatter.page_type === "guardrail")
    .map((page) => pageUrl(page.slug));
  const examplePages = pages
    .filter((page) => page.frontmatter.page_type === "example")
    .map((page) => pageUrl(page.slug));
  const resourceUrls = resourceIndex.resources.map((resource) => resource.url);
  const schemaUrls = resourceIndex.schemas.map((schema) => schema.url);

  return `# JudgmentKit

JudgmentKit makes AI decisions visible, measurable, and usable at runtime.

JudgmentKit is an MCP-first product. Humans use the run surface and inspect surface to connect and verify the system. Agents use the published Markdown mirrors, JSON resources, schemas, examples, and MCP endpoint.

## Overview
- ${ROOT_URL}/

## Start here
${startHere.map((url) => `- ${url}`).join("\n")}

## Workflows
${workflowPages.map((url) => `- ${url}`).join("\n")}

## Guardrails
${guardrailPages.map((url) => `- ${url}`).join("\n")}

## Resources
- ${ROOT_URL}/resources/index.json
${resourceUrls.map((url) => `- ${url}`).join("\n")}

## Schemas
${schemaUrls.map((url) => `- ${url}`).join("\n")}

## Examples
${examplePages.map((url) => `- ${url}`).join("\n")}

## MCP
- ${ROOT_URL}/mcp
- ${ROOT_URL}/mcp-inventory.json

## Changelog
- ${ROOT_URL}/changelog.json
`;
}

function createMcpInventory(resourceIndex: ResourceIndex) {
  return {
    version: "1.0.0",
    endpoint: `${ROOT_URL}/mcp`,
    tools: [
      "list_resources",
      "get_resource",
      "get_workflow_bundle",
      "get_page_markdown",
      "get_example",
      "resolve_related",
    ],
    prompts: [
      "explain_guardrail",
      "apply_guardrail_to_draft",
      "summarize_example_incident",
      "start_design_workflow",
      "refine_design_first_pass",
    ],
    resources: resourceIndex.resources.map((resource) => ({
      id: resource.id,
      type: resource.type,
      url: resource.url,
    })),
  };
}

function createPublicResourceData(resource: LoadedResource) {
  const data = rewriteInternalSiteUrls(resource.data);
  const id = String(data.id);
  const links = (data.links ?? {}) as Record<string, unknown>;

  return {
    ...data,
    links: {
      ...links,
      docs_url: getInspectResourceAnchor(id),
    },
  };
}

function validateRelationships(pages: DocPage[], resources: LoadedResource[]) {
  const errors: string[] = [];
  const pageSet = new Set(pages.map((page) => page.slug));
  const resourcePaths = new Set(resources.map((resource) => getResourcePublicPath(resource.filePath)));

  for (const page of pages) {
    for (const relatedPage of page.frontmatter.related_pages) {
      if (!pageSet.has(relatedPage)) {
        errors.push(`${page.slug} references missing related page ${relatedPage}`);
      }
    }
    for (const relatedResource of page.frontmatter.related_resources) {
      if (!resourcePaths.has(relatedResource)) {
        errors.push(`${page.slug} references missing related resource ${relatedResource}`);
      }
    }
    if (page.frontmatter.page_type === "guardrail") {
      if (!page.frontmatter.workflows?.length) {
        errors.push(`${page.slug} must declare at least one workflow`);
      }
      if (!page.frontmatter.guardrails?.length) {
        errors.push(`${page.slug} must declare at least one guardrail id`);
      }
    }
    if (page.frontmatter.page_type === "workflow" && !page.frontmatter.related_resources.length) {
      errors.push(`${page.slug} must link a workflow resource`);
    }
  }

  return errors;
}

function validateDuplicates(pages: DocPage[], resources: LoadedResource[]) {
  const errors: string[] = [];
  const slugSet = new Set<string>();
  const resourceIdSet = new Set<string>();

  for (const page of pages) {
    if (slugSet.has(page.slug)) {
      errors.push(`Duplicate docs slug ${page.slug}`);
    }
    slugSet.add(page.slug);
  }

  for (const resource of resources) {
    const id = String(resource.data.id);
    if (resourceIdSet.has(id)) {
      errors.push(`Duplicate resource id ${id}`);
    }
    resourceIdSet.add(id);
  }

  return errors;
}

function validateSchemas(resources: LoadedResource[], schemas: LoadedSchema[]) {
  const ajv = createAjv();
  const errors: string[] = [];

  for (const schema of schemas) {
    ajv.addSchema(schema.data, String(schema.data.$id));
  }

  for (const resource of resources) {
    const type = String(resource.data.type);
    const schema = schemas.find((candidate) =>
      candidate.filePath.endsWith(`${type}.schema.json`),
    );

    if (!schema) {
      errors.push(`Missing schema for resource type ${type}`);
      continue;
    }

    const validate = ajv.getSchema(String(schema.data.$id));
    if (!validate) {
      errors.push(`Schema ${schema.filePath} is not registered`);
      continue;
    }

    const valid = validate(resource.data);
    if (!valid) {
      errors.push(
        `${path.basename(resource.filePath)} failed schema validation: ${formatAjvErrors(validate.errors)}`,
      );
    }
  }

  return errors;
}

export async function buildSiteData() {
  const [pages, resources, schemas, changelog] = await Promise.all([
    loadDocPages(),
    loadResources(),
    loadSchemas(),
    loadChangelogEntries(),
  ]);

  const errors = [
    ...validateDuplicates(pages, resources),
    ...validateRelationships(pages, resources),
    ...validateSchemas(resources, schemas),
  ];

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const resourceEntries: ResourceIndexEntry[] = resources.map((resource) => ({
    id: String(resource.data.id),
    type: String(resource.data.type),
    version: String(resource.data.version),
    title: String(resource.data.title),
    summary: String(resource.data.summary),
    url: absoluteUrl(getResourcePublicPath(resource.filePath)),
    schema_url: absoluteUrl(
      String(
        ((resource.data.links ?? {}) as Record<string, unknown>).schema_url ?? "",
      ),
    ),
    hash: sha256(resource.raw),
    last_reviewed: String(resource.data.last_reviewed),
    tags: collectResourceTags(resource.data),
  }));

  const schemaEntries: SchemaIndexEntry[] = schemas.map((schema) => ({
    id: `schema.${path.basename(schema.filePath).replace(".schema.json", "")}`,
    title: String(schema.data.title),
    url: absoluteUrl(getSchemaPublicPath(schema.filePath)),
    hash: sha256(schema.raw),
  }));

  const resourceIndex: ResourceIndex = {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    resources: resourceEntries,
    schemas: schemaEntries,
  };

  return {
    pages,
    resources,
    schemas,
    changelog,
    resourceIndex,
    searchDocuments: [
      ...pages.map(createSearchDocumentForDoc),
      ...resourceEntries.map(createSearchDocumentForResource),
    ],
    graph: createGraph(pages, resourceIndex),
    llms: createLlmsText(pages, resourceIndex),
    mcpInventory: createMcpInventory(resourceIndex),
  };
}

async function writePublicResources(resources: LoadedResource[]) {
  await resetDirectory(PUBLIC_RESOURCES_DIR);
  for (const resource of resources) {
    const target = path.join(
      PUBLIC_RESOURCES_DIR,
      path.relative(RESOURCES_DIR, resource.filePath),
    );
    await ensureDirectory(path.dirname(target));
    await fs.writeFile(target, JSON.stringify(createPublicResourceData(resource), null, 2));
  }
}

async function writePublicSchemas(schemas: LoadedSchema[]) {
  await resetDirectory(PUBLIC_SCHEMAS_DIR);
  for (const schema of schemas) {
    const target = path.join(
      PUBLIC_SCHEMAS_DIR,
      path.relative(SCHEMAS_DIR, schema.filePath),
    );
    await ensureDirectory(path.dirname(target));
    await fs.writeFile(
      target,
      JSON.stringify(rewriteInternalSiteUrls(schema.data), null, 2),
    );
  }
}

async function writePublicMarkdownMirrors(pages: DocPage[]) {
  await resetDirectory(PUBLIC_DOCS_DIR);
  for (const page of pages) {
    const target = path.join(PUBLIC_DOCS_DIR, page.slug.replace("/docs/", ""), "index.md");
    await ensureDirectory(path.dirname(target));
    await fs.writeFile(
      target,
      createMirrorContent(page.frontmatter, page.body, page.headings),
      "utf8",
    );

    const directTarget = path.join(
      PUBLIC_DOCS_DIR,
      `${page.slug.replace("/docs/", "")}.md`,
    );
    await ensureDirectory(path.dirname(directTarget));
    await fs.writeFile(
      directTarget,
      createMirrorContent(page.frontmatter, page.body, page.headings),
      "utf8",
    );
  }
}

async function writeChangelog(changelog: ChangelogEntry[]) {
  await fs.writeFile(PUBLIC_CHANGELOG_PATH, JSON.stringify(changelog, null, 2));
}

export async function writeGeneratedArtifacts() {
  const site = await buildSiteData();

  await Promise.all([
    writePublicResources(site.resources),
    writePublicSchemas(site.schemas),
    writePublicMarkdownMirrors(site.pages),
  ]);

  await ensureDirectory(path.dirname(PUBLIC_RESOURCE_INDEX_PATH));

  await Promise.all([
    fs.writeFile(PUBLIC_RESOURCE_INDEX_PATH, JSON.stringify(site.resourceIndex, null, 2)),
    fs.writeFile(PUBLIC_SEARCH_PATH, JSON.stringify(site.searchDocuments, null, 2)),
    fs.writeFile(PUBLIC_GRAPH_PATH, JSON.stringify(site.graph, null, 2)),
    fs.writeFile(PUBLIC_LLMS_PATH, site.llms),
    fs.writeFile(PUBLIC_MCP_INVENTORY_PATH, JSON.stringify(site.mcpInventory, null, 2)),
    writeChangelog(site.changelog),
  ]);

  return site;
}
