import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border pt-8">
      <div className="flex flex-col gap-3 label-mono text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Rishi Patel · Built in Delaware</p>
        <p>
          Source:{" "}
          <Link
            href="https://github.com/rrp0620/rishi-portfolio"
            target="_blank"
            rel="noreferrer"
            className="border-b border-current hover:text-foreground"
          >
            github.com/rrp0620/rishi-portfolio
          </Link>
        </p>
      </div>
    </footer>
  );
}
