"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type {
  ProductSurfaceContent,
  ProductSurfaceInspectFormat,
  ProductSurfaceInspectItem,
  ProductSurfaceInspectViewerMode,
} from "@/lib/types";

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
const INSPECT_CATEGORY_ORDER = ["Examples", "Workflows", "Guardrails"] as const;

const VIEWER_MODE_LABELS: Record<ProductSurfaceInspectViewerMode, string> = {
  prompt: "Prompt",
  json: "JSON",
  schema: "Schema",
};

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

function formatInspectDocumentText(value: string, format: ProductSurfaceInspectFormat) {
  if (format === "json") {
    return formatInspectJsonText(value);
  }

  return value.endsWith("\n") ? value : `${value}\n`;
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

function groupInspectItems(items: ProductSurfaceInspectItem[]) {
  return INSPECT_CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export function resolveInspectResourceIdFromHash(
  hash: string,
  items: ProductSurfaceInspectItem[],
) {
  const fallbackId = items[0]?.id ?? null;

  if (!hash.startsWith(HASH_PREFIX)) {
    return fallbackId;
  }

  const id = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  return items.some((item) => item.id === id) ? id : fallbackId;
}

function getItemEyebrow(item: ProductSurfaceInspectItem) {
  switch (item.type) {
    case "workflow":
      return "Workflow";
    case "guardrail":
      return "Guardrail";
    case "example":
      return "Example";
    default:
      return item.type;
  }
}

function getItemMetadata(item: ProductSurfaceInspectItem) {
  return [
    { label: "Resource id", value: item.id },
    { label: "Version", value: item.version },
    { label: "Last reviewed", value: item.last_reviewed },
  ];
}

function getDocumentUrl(
  item: ProductSurfaceInspectItem,
  viewerMode: ProductSurfaceInspectViewerMode,
) {
  switch (viewerMode) {
    case "json":
      return item.url;
    case "schema":
      return item.schema_url;
    default:
      return undefined;
  }
}

type InspectSurfaceProps = {
  content: ProductSurfaceContent;
};

export function InspectSurface({ content }: InspectSurfaceProps) {
  const groupedItems = groupInspectItems(content.inspect_primary_items);
  const [selectedResourceId, setSelectedResourceId] = useState(
    content.inspect_primary_items[0]?.id ?? "",
  );
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<ProductSurfaceInspectViewerMode>("prompt");
  const [documents, setDocuments] = useState<Record<string, InspectDocumentState>>({});
  const isMounted = useRef(true);
  const requestedDocuments = useRef<Set<string>>(new Set());

  const selectedItem =
    content.inspect_primary_items.find((item) => item.id === selectedResourceId) ??
    content.inspect_primary_items[0];
  const activeDocumentUrl = selectedItem
    ? getDocumentUrl(selectedItem, viewerMode)
    : undefined;
  const activeDocument = activeDocumentUrl ? documents[activeDocumentUrl] : undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function syncSelectedResourceFromHash() {
      const nextId = resolveInspectResourceIdFromHash(
        window.location.hash,
        content.inspect_primary_items,
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
  }, [content.inspect_primary_items]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    setViewerMode(selectedItem.default_view_mode);
  }, [selectedItem]);

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
    if (!selectedItem) {
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
            text: raw,
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

    const documentRequests = [
      selectedItem.url,
      ...(selectedItem.schema_url ? [selectedItem.schema_url] : []),
    ];

    for (const url of documentRequests) {
      void loadDocument(url);
    }
  }, [selectedItem]);

  if (!selectedItem) {
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

  const metadata = getItemMetadata(selectedItem);

  return (
    <div className="h-full w-full overflow-hidden">
      <button
        type="button"
        aria-label="Close inspect navigation"
        onClick={() => setIsMobileRailOpen(false)}
        className={
          isMobileRailOpen
            ? "fixed inset-x-0 bottom-0 top-[4.75rem] z-40 bg-[rgba(16,24,39,0.32)] transition-opacity duration-200 md:hidden"
            : "pointer-events-none fixed inset-x-0 bottom-0 top-[4.75rem] z-40 bg-[rgba(16,24,39,0.32)] opacity-0 transition-opacity duration-200 md:hidden"
        }
      />

      <section className="surface-panel inspect-browser-shell h-full overflow-hidden md:rounded-none md:border-x-0 md:border-t-0">
        <div className="grid h-full min-h-0 md:grid-cols-[17rem,minmax(0,1fr)] lg:grid-cols-[19rem,minmax(0,1fr)]">
          <aside
            id={INSPECT_RESOURCE_RAIL_ID}
            role={isMobileRailOpen ? "dialog" : undefined}
            aria-modal={isMobileRailOpen ? true : undefined}
            aria-label={isMobileRailOpen ? "Inspect navigation" : undefined}
            className={[
              "theme-divider fixed bottom-0 left-0 top-[4.75rem] z-50 min-w-0 w-[min(18rem,calc(100vw-2rem))] max-w-full overflow-y-auto border-r bg-[var(--theme-panel-muted)] px-4 py-4 shadow-2xl transition-transform duration-200 md:static md:h-full md:w-auto md:max-w-none md:px-5 md:py-6 md:shadow-none",
              isMobileRailOpen
                ? "translate-x-0 pointer-events-auto"
                : "pointer-events-none -translate-x-full md:pointer-events-auto md:translate-x-0",
            ].join(" ")}
          >
            <nav aria-label="Inspect navigation" className="space-y-5">
              {groupedItems.map((group) => (
                <section key={group.category}>
                  <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
                    {group.category}
                  </p>
                  <div className="mt-3 space-y-2">
                    {group.items.map((item) => {
                      const isActive = item.id === selectedItem.id;

                      return (
                        <div id={`resource-${item.id}`} key={item.id}>
                          <button
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => handleSelectResource(item.id)}
                            className={
                              isActive
                                ? "w-full rounded-[var(--landing-radius)] border border-[color:var(--theme-border-strong)] bg-[var(--theme-panel)] px-3 py-3 text-left"
                                : "w-full rounded-[var(--landing-radius)] border border-transparent bg-transparent px-3 py-3 text-left transition duration-200 hover:border-[color:var(--theme-border)] hover:bg-[var(--theme-panel)]"
                            }
                          >
                            <p className="theme-text-primary text-sm font-semibold">
                              {item.title}
                            </p>
                            <p className="theme-text-secondary mt-1 text-xs leading-5">
                              {item.subtitle}
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

          <section className="min-w-0 md:flex md:min-h-0 md:flex-col md:overflow-hidden">
            <div className="theme-divider flex items-center border-b px-5 py-4 sm:px-6 md:hidden">
              <button
                type="button"
                aria-label="Open inspect navigation"
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

            <div className="md:min-h-0 md:overflow-y-auto">
              <div className="px-5 py-5 sm:px-6">
                <div className="max-w-3xl">
                  <p className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.2em]">
                    {getItemEyebrow(selectedItem)}
                  </p>
                  <h2 className="theme-text-primary mt-3 text-[2rem] font-semibold tracking-[-0.04em]">
                    {selectedItem.title}
                  </h2>
                  <p className="theme-text-secondary mt-3 text-base leading-7">
                    {selectedItem.summary}
                  </p>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  {metadata.map((entry) => (
                    <div key={entry.label} className="theme-control-surface min-w-0 px-3 py-3">
                      <dt className="theme-text-muted text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {entry.label}
                      </dt>
                      <dd className="theme-text-primary mt-2 break-all text-sm font-semibold">
                        {entry.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="theme-divider border-t px-5 py-5 sm:px-6">
                <div className="inspect-viewer-toolbar flex flex-wrap items-center gap-2">
                  {selectedItem.available_view_modes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={viewerMode === mode}
                      onClick={() => setViewerMode(mode)}
                      className={
                        viewerMode === mode
                          ? "theme-button-solid landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                          : "theme-button-outline landing-flat-control px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                      }
                    >
                      {VIEWER_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  {viewerMode === "prompt" ? (
                    <pre className="theme-code-block overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 text-xs leading-6 sm:text-sm">
                      <code>{selectedItem.prompt_text}</code>
                    </pre>
                  ) : !activeDocumentUrl ? (
                    <div className="theme-control-surface px-4 py-4">
                      <p className="theme-text-primary text-sm font-semibold">
                        This view is not available for the selected resource.
                      </p>
                      <p className="theme-text-secondary mt-2 text-sm leading-6">
                        Switch back to Prompt or choose another example, workflow, or
                        guardrail.
                      </p>
                    </div>
                  ) : activeDocument?.status === "error" ? (
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
                          __html: highlightInspectJson(
                            formatInspectDocumentText(activeDocument.text, "json"),
                          ),
                        }}
                      />
                    </pre>
                  ) : (
                    <div className="theme-control-surface px-4 py-4">
                      <p className="theme-text-primary text-sm font-semibold">
                        Loading {VIEWER_MODE_LABELS[viewerMode]}...
                      </p>
                      <p className="theme-text-secondary mt-2 text-sm leading-6">
                        Pulling the selected resource into the inline viewer.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
