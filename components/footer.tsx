import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t pt-8 text-sm text-muted-foreground">
      <p>
        Built with Next.js, Tailwind, and shadcn/ui. Code at{" "}
        <Link
          href="https://github.com/rrp0620/rishi-portfolio"
          className="underline underline-offset-4 hover:text-primary"
          target="_blank"
          rel="noreferrer"
        >
          github.com/rrp0620/rishi-portfolio
        </Link>
        . Most of the build was paired with Cursor and Claude Code.
      </p>
    </footer>
  );
}
