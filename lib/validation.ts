import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { z } from "zod";

import type { DocFrontmatter } from "@/lib/types";

export const docFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().startsWith("/docs/"),
  page_type: z.enum([
    "concept",
    "workflow",
    "guardrail",
    "role",
    "example",
    "reference",
    "start",
  ]),
  summary: z.string().min(1),
  agent_summary: z.string().min(1),
  audiences: z.array(z.string()).min(1),
  workflows: z.array(z.string()).optional(),
  guardrails: z.array(z.string()).optional(),
  owners: z.object({
    primary: z.string().min(1),
    risk: z.string().optional(),
    operational: z.string().optional(),
  }),
  status: z.enum(["active", "deprecated", "draft"]),
  last_reviewed: z.preprocess(
    (value) => {
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      return value;
    },
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ),
  related_pages: z.array(z.string()),
  related_resources: z.array(z.string()),
  related_schemas: z.array(z.string()),
  toc: z.boolean(),
});

export function createAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  return ajv;
}

export function formatAjvErrors(errors: unknown) {
  if (!Array.isArray(errors)) {
    return "Unknown validation error";
  }

  return errors
    .map((error) => {
      const instancePath =
        typeof error.instancePath === "string" && error.instancePath.length > 0
          ? error.instancePath
          : "/";
      return `${instancePath} ${error.message ?? "is invalid"}`;
    })
    .join("; ");
}
