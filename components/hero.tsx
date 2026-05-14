import Link from "next/link";

export function Hero() {
  return (
    <section className="space-y-8 pt-2">
      <div className="label-mono text-muted-foreground">
        A portfolio · 2026
      </div>

      <div className="space-y-6">
        <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
          Rishi Patel.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/85 md:text-xl">
          I do GTM analytics at a public company as my day job. On nights
          and weekends I build AI tools for small businesses where most
          of the work still happens in a spreadsheet.
        </p>
      </div>

      <div className="space-y-5">
        <div className="label-mono text-muted-foreground">
          Looking for an applied-AI role focused on getting models into real workflows and helping teams adopt them. Remote, based in Delaware.
        </div>

        <Link
          href="#audit"
          className="group inline-flex items-center gap-2.5 rounded-sm border border-accent bg-accent/8 px-3.5 py-2 transition-colors hover:bg-accent/15"
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
          />
          <span className="label-mono text-foreground">
            Try the live AI audit
          </span>
          <span
            aria-hidden
            className="label-mono text-accent transition-transform group-hover:translate-y-0.5"
          >
            ↓
          </span>
        </Link>
      </div>
    </section>
  );
}
