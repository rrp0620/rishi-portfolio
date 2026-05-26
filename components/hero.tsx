/**
 * Hero. Three sentences. No hobbyist framing. Two CTAs — one to the live
 * audit demo, one to the Ask Rishi tool. Both rendered as quiet underlined
 * links rather than the old terra-cotta-pill, which had become the v0
 * portfolio default.
 */
export function Hero() {
  return (
    <section className="space-y-8 pt-2">
      <div className="space-y-6">
        <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
          Rishi Patel
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/85 md:text-xl">
          I work with executives to ship AI use cases that move real
          numbers. By day I&apos;m on the business planning team at a public
          company, reporting to the Chief Business Officer. On the side I
          build customer-facing AI for small businesses. Open to AI
          deployment roles.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        <a
          href="#audit"
          className="text-base text-foreground underline decoration-accent decoration-1 underline-offset-[6px] transition-colors hover:decoration-2 hover:text-accent"
        >
          Try the live audit
        </a>
        <span aria-hidden className="text-muted-foreground/40">
          /
        </span>
        <a
          href="#ask"
          className="text-base text-foreground underline decoration-accent decoration-1 underline-offset-[6px] transition-colors hover:decoration-2 hover:text-accent"
        >
          Ask me anything
        </a>
      </div>
    </section>
  );
}
