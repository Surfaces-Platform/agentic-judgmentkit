"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type {
  ProductSurfaceContent,
  ProductSurfaceInspectResource,
} from "@/lib/types";

type InspectViewerMode = "json" | "schema";
type InspectDocumentState =
  | {
      status: "loading";
    }
  | {
      status: "ready";
      text: string;
    }
  | {
      status: "error";
      error: string;
    };

const HASH_PREFIX = "#resource-";
const INSPECT_RESOURCE_RAIL_ID = "inspect-resource-rail";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatInspectJsonText(value: string) {
  const trimmed = value.trim();

  try {
    return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`;
  } catch {
    return trimmed;
  }
}

export function highlightInspectJson(value: string) {
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

export function formatInspectResourceTypeLabel(type: string) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}s`;
}

export function groupInspectResources(resources: ProductSurfaceInspectResource[]) {
  return resources.reduce<Record<string, ProductSurfaceInspectResource[]>>((groups, resource) => {
    const next = groups[resource.type] ?? [];
    next.push(resource);
    groups[resource.type] = next;
    return groups;
  }, {});
}

export function resolveInspectResourceIdFromHash(
  hash: string,
  resources: ProductSurfaceInspectResource[],
) {
  const fallbackId = resources[0]?.id ?? null;

  if (!hash.startsWith(HASH_PREFIX)) {
    return fallbackId;
  }

  const id = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  return resources.some((resource) => resource.id === id) ? id : fallbackId;
}

type InspectSurfaceProps = {
  content: ProductSurfaceContent;
};

export function InspectSurface({ content }: InspectSurfaceProps) {
  const groupedReferences = content.reference_links.reduce<
    Record<string, ProductSurfaceContent["reference_links"]>
  >((groups, link) => {
    const next = groups[link.group] ?? [];
    next.push(link);
    groups[link.group] = next;
    return groups;
  }, {});
  const groupedResources = groupInspectResources(content.inspect_resources);
  const [selectedResourceId, setSelectedResourceId] = useState(
    content.inspect_resources[0]?.id ?? "",
  );
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<InspectViewerMode>("json");
  const [documents, setDocuments] = useState<Record<string, InspectDocumentState>>({});
  const isMounted = useRef(true);
  const requestedDocuments = useRef<Set<string>>(new Set());

  const selectedResource =
    content.inspect_resources.find((resource) => resource.id === selectedResourceId) ??
    content.inspect_resources[0];
  const activeDocumentUrl =
    viewerMode === "json" ? selectedResource?.url : selectedResource?.schema_url;
  const activeDocument = activeDocumentUrl ? documents[activeDocumentUrl] : undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function syncSelectedResourceFromHash() {
      const nextId = resolveInspectResourceIdFromHash(
        window.location.hash,
        content.inspect_resources,
      );

      if (!nextId) {
        return;
      }

      setSelectedResourceId((current) => (current === nextId ? current : nextId));
      setIsMobileRailOpen(false);
    }

    syncSelectedResourceFromHash();
    window.addEventListener("hashchange", syncSelectedResourceFromHash);

    return () => window.removeEventListener("hashchange", syncSelectedResourceFromHash);
  }, [content.inspect_resources]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    if (mediaQuery.matches) {
      setIsMobileRailOpen(false);
    }

    function syncRailForViewport(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsMobileRailOpen(false);
      }
    }

    mediaQuery.addEventListener("change", syncRailForViewport);

    return () => mediaQuery.removeEventListener("change", syncRailForViewport);
  }, []);

  useEffect(() => {
    if (!isMobileRailOpen || typeof window === "undefined") {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileRailOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileRailOpen]);

  useEffect(() => {
    if (!isMobileRailOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobileRailOpen]);

  useEffect(() => {
    if (!selectedResource) {
      return;
    }

    async function loadDocument(url: string) {
      if (requestedDocuments.current.has(url)) {
        return;
      }

      requestedDocuments.current.add(url);
      setDocuments((current) => ({
        ...current,
        [url]: {
          status: "loading",
        },
      }));

      try {
        const response = await fetch(url, {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const raw = await response.text();

        if (!isMounted.current) {
          return;
        }

        setDocuments((current) => ({
          ...current,
          [url]: {
            status: "ready",
            text: formatInspectJsonText(raw),
          },
        }));
      } catch (error) {
        if (!isMounted.current) {
          return;
        }

        setDocuments((current) => ({
          ...current,
          [url]: {
            status: "error",
            error: error instanceof Error ? error.message : "Unable to load document.",
          },
        }));
      }
    }

    void loadDocument(selectedResource.url);
    void loadDocument(selectedResource.schema_url);
  }, [selectedResource]);

  if (!selectedResource) {
    return null;
  }

  function handleSelectResource(resourceId: string) {
    startTransition(() => {
      setSelectedResourceId(resourceId);
      setIsMobileRailOpen(false);

      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${HASH_PREFIX}${resourceId}`,
        );
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <button
        type="button"
        aria-label="Close published resources"
        onClick={() => setIsMobileRailOpen(false)}
        className={
          isMobileRailOpen
            ? "fixed inset-0 z-40 bg-[rgba(16,24,39,0.32)] transition-opacity duration-200 md:hidden"
            : "pointer-events-none fixed inset-0 z-40 bg-[rgba(16,24,39,0.32)] opacity-0 transition-opacity duration-200 md:hidden"
        }
      />

      <section className="surface-panel inspect-browser-shell md:overflow-hidden">
        <div className="grid md:grid-cols-[15rem,minmax(0,1fr)] lg:grid-cols-[18rem,minmax(0,1fr)]">
          <aside
            id={INSPECT_RESOURCE_RAIL_ID}
            role={isMobileRailOpen ? "dialog" : undefined}
            aria-modal={isMobileRailOpen ? true : undefined}
            aria-label={isMobileRailOpen ? "Published resources" : undefined}
            className={[
              "theme-divider fixed inset-y-0 left-0 z-50 min-w-0 w-[min(18rem,calc(100vw-2rem))] max-w-full overflow-y-auto border-r bg-[var(--theme-panel-muted)] px-4 py-4 shadow-2xl transition-transform duration-200 md:static md:z-auto md:w-auto md:max-w-none md:overflow-visible md:border-r-0 md:px-3 lg:px-5 md:shadow-none",
              isMobileRailOpen
                ? "translate-x-0 pointer-events-auto"
                : "pointer-events-none -translate-x-full md:pointer-events-auto md:translate-x-0",
            ].join(" ")}
          >
            <nav aria-label="Published resources" className="space-y-4 lg:space-y-5">
              {Object.entries(groupedResources).map(([type, resources]) => (
                <section key={type}>
                  <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
                    {formatInspectResourceTypeLabel(type)}
                  </p>
                  <div className="mt-3 space-y-2">
                    {resources.map((resource) => {
                      const isActive = resource.id === selectedResource.id;

                      return (
                        <div id={`resource-${resource.id}`} key={resource.id}>
                          <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => handleSelectResource(resource.id)}
                            className={
                              isActive
                                ? "w-full rounded-[var(--landing-radius)] border border-[color:var(--theme-border-strong)] bg-[var(--theme-panel)] px-3 py-3 md:px-2.5 lg:px-3 text-left"
                                : "w-full rounded-[var(--landing-radius)] border border-transparent bg-transparent px-3 py-3 md:px-2.5 lg:px-3 text-left transition duration-200 hover:border-[color:var(--theme-border)] hover:bg-[var(--theme-panel)]"
                            }
                          >
                            <p className="theme-text-primary text-sm font-semibold">
                              {resource.title}
                            </p>
                            <p className="theme-text-secondary mt-1 text-xs leading-5">
                              {resource.id}
                            </p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </aside>

          <section className="theme-divider min-w-0 md:border-l">
            <div className="theme-divider flex items-center border-b px-5 py-4 sm:px-6 md:hidden">
              <button
                type="button"
                aria-label="Open published resources"
                aria-expanded={isMobileRailOpen}
                aria-controls={INSPECT_RESOURCE_RAIL_ID}
                onClick={() => setIsMobileRailOpen(true)}
                className="theme-button-outline landing-flat-control inline-flex h-10 w-10 items-center justify-center"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="max-w-3xl">
                <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {selectedResource.type}
                </p>
                <h2 className="theme-text-primary mt-3 text-[2rem] font-semibold tracking-[-0.04em]">
                  {selectedResource.title}
                </h2>
                <p className="theme-text-secondary mt-3 text-base leading-7">
                  {selectedResource.summary}
                </p>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="theme-control-surface min-w-0 px-3 py-3">
                  <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Resource id
                  </dt>
                  <dd className="theme-text-primary mt-2 text-sm font-semibold">
                    {selectedResource.id}
                  </dd>
                </div>
                <div className="theme-control-surface min-w-0 px-3 py-3">
                  <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Version
                  </dt>
                  <dd className="theme-text-primary mt-2 text-sm font-semibold">
                    {selectedResource.version}
                  </dd>
                </div>
                <div className="theme-control-surface min-w-0 px-3 py-3">
                  <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                    Last reviewed
                  </dt>
                  <dd className="theme-text-primary mt-2 text-sm font-semibold">
                    {selectedResource.last_reviewed}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="theme-divider border-t px-5 py-5 sm:px-6">
              <div className="inspect-viewer-toolbar flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={viewerMode === "json"}
                  onClick={() => setViewerMode("json")}
                  className={
                    viewerMode === "json"
                      ? "theme-button-solid landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                      : "theme-button-outline landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  }
                >
                  JSON
                </button>
                <button
                  type="button"
                  aria-pressed={viewerMode === "schema"}
                  onClick={() => setViewerMode("schema")}
                  className={
                    viewerMode === "schema"
                      ? "theme-button-solid landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                      : "theme-button-outline landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                  }
                >
                  Schema
                </button>
              </div>

              <div className="mt-4">
                {activeDocument?.status === "error" ? (
                  <div className="theme-control-surface px-4 py-4">
                    <p className="theme-text-primary text-sm font-semibold">
                      Unable to load this document.
                    </p>
                    <p className="theme-text-secondary mt-2 text-sm leading-6">
                      {activeDocument.error}
                    </p>
                  </div>
                ) : activeDocument?.status === "ready" ? (
                  <pre className="theme-code-block overflow-x-auto px-4 py-4 text-xs leading-6 sm:text-sm">
                    <code
                      dangerouslySetInnerHTML={{
                        __html: highlightInspectJson(activeDocument.text),
                      }}
                    />
                  </pre>
                ) : (
                  <div className="theme-control-surface px-4 py-4">
                    <p className="theme-text-primary text-sm font-semibold">
                      Loading {viewerMode === "json" ? "JSON" : "schema"}...
                    </p>
                    <p className="theme-text-secondary mt-2 text-sm leading-6">
                      Pulling the selected resource into the inline viewer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>

      {content.reference_links.length > 0 ? (
        <section className="surface-panel-muted mt-4 px-4 py-4 sm:px-5">
          <p className="theme-text-primary text-sm font-semibold">Published endpoints and files</p>
          <p className="theme-text-secondary mt-1 text-sm leading-6">{content.inspect.description}</p>

          <div className="mt-5 space-y-4">
            {Object.entries(groupedReferences).map(([group, links]) => (
              <div key={group}>
                <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.22em]">
                  {group}
                </p>
                <div className="theme-divider mt-2 divide-y">
                  {links.map((link) => (
                    <div
                      key={`${group}-${link.url}`}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="theme-text-primary text-sm font-medium">{link.label}</p>
                        <p className="theme-text-muted mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {link.kind}
                        </p>
                      </div>
                      <a
                        href={link.url}
                        className="theme-link-subtle text-sm font-medium underline underline-offset-4"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
