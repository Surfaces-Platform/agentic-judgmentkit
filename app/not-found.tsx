import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="surface-panel px-6 py-10 text-center sm:px-8">
        <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
          Not found
        </p>
        <h1 className="theme-text-primary mt-4 text-4xl font-semibold tracking-tight">
          This path is not part of the published judgment corpus.
        </h1>
        <p className="theme-text-secondary mt-4 text-base leading-7">
          Try the start pages, the resource index, or the changelog to reorient.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs/start/what-is-judgmentkit"
            className="theme-button-solid inline-flex items-center justify-center px-4 py-2 text-sm font-semibold transition"
          >
            Start here
          </Link>
          <Link
            href="/resources/index.json"
            className="theme-button-outline inline-flex items-center justify-center px-4 py-2 text-sm font-semibold transition"
          >
            Resource index
          </Link>
        </div>
      </div>
    </div>
  );
}
