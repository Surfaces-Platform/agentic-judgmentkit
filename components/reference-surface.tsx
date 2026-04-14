"use client";

import { useEffect, useId, useState } from "react";

import { CopyButton } from "@/components/product/copy-button";
import { createCommandAnchor } from "@/lib/mcp-reference-anchor";
import type {
  InstallContractCommandReference,
  ProductSurfaceContent,
  ProductSurfaceInspectFormat,
  ProductSurfaceReferenceItem,
} from "@/lib/types";

type ReferenceModalState = {
  title: string;
  url: string;
  format: ProductSurfaceInspectFormat;
};

type ReferenceDocumentState =
  | {
      status: "idle" | "loading";
      text?: undefined;
      error?: undefined;
    }
  | {
      status: "ready";
      text: string;
      error?: undefined;
    }
  | {
      status: "error";
      text?: undefined;
      error: string;
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightJson(value: string) {
  const tokenPattern =
    /"(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;

  let html = "";
  let lastIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    const token = match[0];

    html += escapeHtml(value.slice(lastIndex, index));

    let className = "inspect-token-number";

    if (token.startsWith('"')) {
      className = token.endsWith(":") ? "inspect-token-key" : "inspect-token-string";
    } else if (token === "true" || token === "false") {
      className = "inspect-token-boolean";
    } else if (token === "null") {
      className = "inspect-token-null";
    }

    html += `<span class="${className}">${escapeHtml(token)}</span>`;
    lastIndex = index + token.length;
  }

  html += escapeHtml(value.slice(lastIndex));
  return html;
}

function inferReferenceFormat(url: string): ProductSurfaceInspectFormat {
  if (url.endsWith(".json") || url === "/mcp") {
    return "json";
  }

  if (url.endsWith(".md")) {
    return "markdown";
  }

  if (url.endsWith(".txt")) {
    return "text";
  }

  if (url === "/install") {
    return "text";
  }

  return "html";
}

export function formatReferenceSourceText(
  value: string,
  format: ProductSurfaceInspectFormat,
  prettyPrint: boolean,
) {
  if (format === "json" && prettyPrint) {
    try {
      return `${JSON.stringify(JSON.parse(value.trim()), null, 2)}\n`;
    } catch {
      return value.endsWith("\n") ? value : `${value}\n`;
    }
  }

  return value.endsWith("\n") ? value : `${value}\n`;
}

function groupReferenceItems(items: ProductSurfaceReferenceItem[]) {
  const groups = new Map<string, ProductSurfaceReferenceItem[]>();

  for (const item of items) {
    const existing = groups.get(item.group) ?? [];
    existing.push(item);
    groups.set(item.group, existing);
  }

  return Array.from(groups, ([group, groupItems]) => ({
    group,
    items: groupItems,
  }));
}

function getReferenceMeta(item: ProductSurfaceReferenceItem) {
  const formatLabel = item.raw_format.toUpperCase();

  switch (item.type) {
    case "resource":
      return `Published resource • ${formatLabel}`;
    case "markdown":
      return `Docs mirror • ${formatLabel}`;
    case "schema":
      return `Schema • ${formatLabel}`;
    case "endpoint":
      return `Endpoint • ${formatLabel}`;
    default:
      return `${item.type} • ${formatLabel}`;
  }
}

function renderCommandArguments(reference: InstallContractCommandReference) {
  return reference.arguments.length > 0 ? reference.arguments.join(", ") : "none";
}

function matchesReferenceItem(item: ProductSurfaceReferenceItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.group,
    item.title,
    item.summary,
    item.subtitle,
    item.url,
    item.type,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesCommandReference(
  reference: InstallContractCommandReference,
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = [
    reference.name,
    reference.description,
    reference.docs_url,
    reference.arguments.join(" "),
    reference.example_call ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

type ReferenceSurfaceProps = {
  content: ProductSurfaceContent;
};

export function ReferenceSurface({ content }: ReferenceSurfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openReference, setOpenReference] = useState<ReferenceModalState | null>(null);
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [documentState, setDocumentState] = useState<ReferenceDocumentState>({
    status: "idle",
  });
  const modalTitleId = useId();
  const normalizedQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!openReference || typeof window === "undefined") {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenReference(null);
      }
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openReference]);

  useEffect(() => {
    if (!openReference) {
      setDocumentState({ status: "idle" });
      setPrettyPrint(true);
      return;
    }

    let cancelled = false;
    const sourceUrl = openReference.url.split("#")[0] || openReference.url;

    setDocumentState({ status: "loading" });
    setPrettyPrint(true);

    async function loadSource() {
      try {
        const response = await fetch(sourceUrl, {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const text = await response.text();

        if (!cancelled) {
          setDocumentState({
            status: "ready",
            text,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentState({
            status: "error",
            error: error instanceof Error ? error.message : "Unable to load source.",
          });
        }
      }
    }

    void loadSource();

    return () => {
      cancelled = true;
    };
  }, [openReference]);

  const referenceGroups = groupReferenceItems(content.inspect_reference_items)
    .map((group) => ({
      group: group.group,
      items: group.items.filter((item) => matchesReferenceItem(item, normalizedQuery)),
    }))
    .filter((group) => group.items.length > 0);

  const implementationGroups = [
    {
      title: "Tools",
      kind: "tool" as const,
      entries: content.tool_reference.filter((reference) =>
        matchesCommandReference(reference, normalizedQuery),
      ),
    },
    {
      title: "Prompts",
      kind: "prompt" as const,
      entries: content.prompt_reference.filter((reference) =>
        matchesCommandReference(reference, normalizedQuery),
      ),
    },
  ].filter((group) => group.entries.length > 0);

  const hasResults = referenceGroups.length > 0 || implementationGroups.length > 0;
  const formattedSource =
    openReference && documentState.status === "ready"
      ? formatReferenceSourceText(documentState.text, openReference.format, prettyPrint)
      : "";

  return (
    <>
      <div className="mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="surface-panel-muted overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
              Reference
            </p>
            <h1 className="theme-text-primary mt-3 text-[2rem] font-semibold tracking-[-0.04em] sm:text-[2.4rem]">
              Published artifacts and command anchors
            </h1>
          </div>

          <div className="theme-divider border-t px-4 py-5 sm:px-6">
            <label
              htmlFor="reference-search"
              className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]"
            >
              Search
            </label>
            <input
              id="reference-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search reference"
              className="theme-control-surface theme-text-primary mt-3 h-12 w-full px-4 text-sm outline-none placeholder:text-[color:var(--theme-text-muted)]"
            />
          </div>

          {!hasResults ? (
            <div className="theme-divider border-t px-4 py-5 sm:px-6">
              <div className="theme-control-surface px-4 py-4">
                <p className="theme-text-primary text-sm font-semibold">No reference matches.</p>
                <p className="theme-text-secondary mt-2 text-sm leading-6">
                  Try a different name, path, or command.
                </p>
              </div>
            </div>
          ) : null}

          {referenceGroups.length > 0 ? (
            <div className="theme-divider border-t px-4 py-5 sm:px-6">
              <div className="space-y-6">
                {referenceGroups.map((group) => (
                  <section key={group.group}>
                    <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
                      {group.group}
                    </p>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      {group.items.map((item) => (
                        <article key={item.id} className="theme-control-surface min-w-0 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="theme-text-primary text-sm font-semibold">
                                {item.title}
                              </p>
                              <p className="theme-text-muted mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                {getReferenceMeta(item)}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              onClick={() =>
                                setOpenReference({
                                  title: item.title,
                                  url: item.url,
                                  format: item.raw_format,
                                })
                              }
                              className="theme-link-subtle shrink-0 text-sm font-medium underline underline-offset-4"
                            >
                              View source
                            </button>
                          </div>
                          <p className="theme-text-secondary mt-3 text-sm leading-6">
                            {item.summary}
                          </p>
                          <p className="theme-text-muted mt-3 break-all font-mono text-[11px] leading-5">
                            {item.subtitle}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}

          {implementationGroups.length > 0 ? (
            <div id="commands" className="theme-divider border-t px-4 py-5 sm:px-6">
              <p className="theme-text-primary text-sm font-semibold">Implementation reference</p>
              <p className="theme-text-secondary mt-1 max-w-3xl text-sm leading-6">
                After you verify the local install, use these command anchors to map the
                machine-facing tool and prompt names to their docs URLs, argument shapes, and
                example calls.
              </p>

              <div className="mt-5 space-y-5">
                {implementationGroups.map((group) => (
                  <section key={group.title}>
                    <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
                      {group.title}
                    </p>
                    <div className="theme-divider mt-2 divide-y">
                      {group.entries.map((reference) => (
                        <div
                          id={createCommandAnchor(group.kind, reference.name)}
                          key={`${group.kind}-${reference.name}`}
                          className="py-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="theme-text-primary text-sm font-semibold">
                                {reference.name}
                              </p>
                              <p className="theme-text-secondary mt-1 text-sm leading-6">
                                {reference.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              onClick={() =>
                                setOpenReference({
                                  title: reference.name,
                                  url: reference.docs_url,
                                  format: inferReferenceFormat(reference.docs_url),
                                })
                              }
                              className="theme-link-subtle shrink-0 text-sm font-medium underline underline-offset-4"
                            >
                              View source
                            </button>
                          </div>
                          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="theme-control-surface min-w-0 px-3 py-3">
                              <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Arguments
                              </dt>
                              <dd className="theme-text-primary mt-2 text-sm leading-6">
                                {renderCommandArguments(reference)}
                              </dd>
                            </div>
                            <div className="theme-control-surface min-w-0 px-3 py-3">
                              <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Docs URL
                              </dt>
                              <dd className="theme-text-primary mt-2 break-all text-sm leading-6">
                                {reference.docs_url}
                              </dd>
                            </div>
                          </dl>
                          {reference.example_call ? (
                            <pre className="theme-code-block mt-3 overflow-x-auto px-4 py-4 text-xs leading-6 sm:text-sm">
                              <code>{reference.example_call}</code>
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {openReference ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5">
          <button
            type="button"
            aria-label="Close reference preview"
            onClick={() => setOpenReference(null)}
            className="absolute inset-0 bg-[rgba(16,24,39,0.58)]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="surface-panel relative z-[90] flex h-[92vh] w-[96vw] max-w-[88rem] flex-col overflow-hidden"
          >
            <div className="theme-divider flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Reference preview
                </p>
                <h2
                  id={modalTitleId}
                  className="theme-text-primary mt-1 truncate text-base font-semibold sm:text-lg"
                >
                  {openReference.title}
                </h2>
                <p className="theme-text-secondary mt-1 truncate text-sm">
                  {openReference.url}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <CopyButton
                  value={openReference.url}
                  label="Copy source path"
                />
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setOpenReference(null)}
                  className="theme-link-subtle inline-flex h-10 w-10 items-center justify-center text-[1.6rem] leading-none transition hover:text-[color:var(--theme-text-primary)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M6 6 18 18" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="theme-divider flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                Source
              </p>
              {openReference.format === "json" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={prettyPrint}
                    onClick={() => setPrettyPrint(true)}
                    className={
                      prettyPrint
                        ? "theme-button-solid inline-flex h-9 items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.16em]"
                        : "theme-button-outline inline-flex h-9 items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.16em]"
                    }
                  >
                    Pretty
                  </button>
                  <button
                    type="button"
                    aria-pressed={!prettyPrint}
                    onClick={() => setPrettyPrint(false)}
                    className={
                      !prettyPrint
                        ? "theme-button-solid inline-flex h-9 items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.16em]"
                        : "theme-button-outline inline-flex h-9 items-center justify-center px-3 text-xs font-semibold uppercase tracking-[0.16em]"
                    }
                  >
                    Raw
                  </button>
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[var(--theme-panel-muted)] p-2 sm:p-3">
              {documentState.status === "loading" ? (
                <div className="theme-control-surface flex h-full items-center justify-center px-4 py-4">
                  <p className="theme-text-secondary text-sm">Loading source...</p>
                </div>
              ) : documentState.status === "error" ? (
                <div className="theme-control-surface flex h-full items-center justify-center px-4 py-4">
                  <p className="theme-text-secondary text-sm">{documentState.error}</p>
                </div>
              ) : (
                <pre className="theme-code-block min-h-full overflow-x-auto px-4 py-4 text-xs leading-6 sm:text-sm">
                  <code
                    dangerouslySetInnerHTML={{
                      __html:
                        openReference.format === "json"
                          ? highlightJson(formattedSource)
                          : escapeHtml(formattedSource),
                    }}
                  />
                </pre>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
