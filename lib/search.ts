import type { SearchDocument } from "@/lib/types";

const SYNONYMS: Record<string, string[]> = {
  brand: ["tone", "voice"],
  contract: ["guardrail", "intent"],
  drift: ["mismatch", "deviation"],
  provenance: ["audit", "trace"],
  workflow: ["use case", "flow"],
};

function tokenize(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function expandTerms(terms: string[]) {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SYNONYMS[term] ?? []) {
      expanded.add(synonym);
    }
  }
  return [...expanded];
}

function scoreDocument(document: SearchDocument, terms: string[]) {
  let score = 0;

  for (const term of terms) {
    if (document.title.toLowerCase() === term) {
      score += 100;
    }
    if (document.title.toLowerCase().includes(term)) {
      score += 30;
    }
    if (document.summary.toLowerCase().includes(term)) {
      score += 20;
    }
    if (document.headings?.some((heading) => heading.toLowerCase().includes(term))) {
      score += 10;
    }
    if (document.tags?.some((tag) => tag.toLowerCase().includes(term))) {
      score += 5;
    }
    if (document.searchText.includes(term)) {
      score += 3;
    }
    if (document.id.toLowerCase() === term || document.id.toLowerCase().includes(term)) {
      score += 25;
    }
  }

  return score;
}

export type SearchFilters = {
  pageType?: string;
  audience?: string;
  kind?: "doc" | "resource";
};

export function searchDocuments(
  documents: SearchDocument[],
  query: string,
  filters: SearchFilters = {},
) {
  const terms = expandTerms(tokenize(query));
  const withScores = documents
    .filter((document) => {
      if (filters.kind && document.kind !== filters.kind) {
        return false;
      }
      if (filters.pageType && document.pageType !== filters.pageType) {
        return false;
      }
      if (filters.audience && !document.audiences?.includes(filters.audience)) {
        return false;
      }
      return true;
    })
    .map((document) => ({
      document,
      score: scoreDocument(document, terms),
    }))
    .filter((entry) => (terms.length ? entry.score > 0 : true))
    .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title));

  return withScores.map((entry) => entry.document);
}
