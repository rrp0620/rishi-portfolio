import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * A thin header — just a wordmark on the left, a theme toggle on the right.
 * Intentionally not sticky. Not labeled "Portfolio · 2026" — that read as
 * editorial-template scaffolding.
 */
export function PageHeader() {
  return (
    <header className="mx-auto max-w-5xl px-6 pt-8">
      <div className="flex items-center justify-between pb-4">
        <Link
          href="/"
          aria-label="Rishi Patel, home"
          className="text-sm font-medium text-foreground transition-colors hover:text-accent"
        >
          Rishi Patel
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
