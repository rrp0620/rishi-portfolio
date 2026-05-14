export function Hero() {
  return (
    <section className="space-y-8 pt-2">
      <div className="space-y-6">
        <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
          Rishi Patel.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/85 md:text-xl">
          My job at a public company is finding where AI actually moves a
          number and shipping the tools that do it. I keep building
          outside of work too, because the toolchain shifts every couple
          weeks and I want to stay ahead of what it can do.
        </p>
      </div>

      <div className="space-y-5">
        <div className="label-mono text-muted-foreground">
          Looking for an applied-AI role focused on getting models into
          real workflows and helping teams adopt them. Remote, based in
          Delaware.
        </div>

        <a
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
        </a>
      </div>
    </section>
  );
}
