import { loadChangelogEntries } from "@/lib/content";

export default async function ChangelogPage() {
  const changelog = await loadChangelogEntries();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-panel px-6 py-8 sm:px-8">
        <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.22em]">
          Changelog
        </p>
        <h1 className="theme-text-primary mt-4 text-4xl font-semibold tracking-tight">
          Public changes to the JudgmentKit corpus
        </h1>
        <div className="mt-8 space-y-6">
          {changelog.map((entry) => (
            <article
              key={entry.id}
              className="surface-panel-muted p-6"
            >
              <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.18em]">
                {new Date(entry.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold tracking-tight">
                {entry.title}
              </h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">{entry.summary}</p>
              <ul className="theme-text-secondary mt-4 space-y-2 text-sm leading-6">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
