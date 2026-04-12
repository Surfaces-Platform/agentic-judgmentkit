export function SiteFooter() {
  return (
    <footer className="theme-divider mt-auto border-t">
      <div className="theme-text-secondary flex min-h-[5rem] w-full flex-col justify-center gap-2 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          &copy; 2026{" "}
          <a
            className="theme-link-subtle font-medium underline underline-offset-4"
            href="https://surfaces.systems"
            target="_blank"
            rel="noreferrer noopener"
          >
            surfaces.systems
          </a>
        </p>
        <a
          className="theme-link-subtle font-medium underline underline-offset-4"
          href="https://github.com/Surfaces-Platform/agentic-judgmentkit"
        >
          GitHub project
        </a>
      </div>
    </footer>
  );
}
