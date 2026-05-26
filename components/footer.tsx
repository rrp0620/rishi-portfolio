import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border pt-8">
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Rishi Patel</p>
        <p>
          Source:{" "}
          <Link
            href="https://github.com/rrp0620/rishi-portfolio"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-muted-foreground/40 decoration-1 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            github.com/rrp0620/rishi-portfolio
          </Link>
        </p>
      </div>
    </footer>
  );
}
