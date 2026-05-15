export function Hero() {
  return (
    <section className="space-y-8 pt-2">
      <div className="space-y-6">
        <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
          Rishi Patel<span className="text-accent">.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/85 md:text-xl">
          I&apos;m an analyst at a public company. After work I build AI
          tools and play with the new ones as they ship, mostly to see
          what they can actually do.
        </p>
      </div>

      <a
        href="#audit"
        className="group inline-flex items-center gap-2.5 rounded-sm bg-accent px-4 py-2.5 transition-colors hover:bg-accent/90"
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-accent-foreground/80"
        />
        <span className="label-mono text-accent-foreground">
          Try the live AI audit
        </span>
        <span
          aria-hidden
          className="label-mono text-accent-foreground transition-transform group-hover:translate-y-0.5"
        >
          ↓
        </span>
      </a>
    </section>
  );
}
