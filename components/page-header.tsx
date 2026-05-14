import Link from "next/link";

/**
 * A thin editorial header that runs across the top of every page. Just a
 * wordmark on the left and the section number on the right. Intentionally
 * not sticky — this is a portfolio, not an app.
 */
export function PageHeader() {
  return (
    <header className="mx-auto max-w-5xl px-6 pt-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/"
          aria-label="Rishi Patel — home"
          className="label-mono text-foreground transition-colors hover:text-accent"
        >
          Rishi Patel
        </Link>
        <span className="label-mono text-muted-foreground">
          Portfolio · 2026
        </span>
      </div>
    </header>
  );
}
