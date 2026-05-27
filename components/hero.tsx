import Image from "next/image";

/**
 * Hero — Gloria Lo direction, translated to dark.
 *
 *   • Heavy bold sans (Inter 900) for "Hi, I'm Rishi Patel" — chunky
 *     wordmark, not a serif. Display serif is reserved for project titles
 *     elsewhere on the site.
 *   • Warm amber marker-highlighter behind the name. Marker-style band
 *     (not a flat fill) via the .highlight utility.
 *   • Clean headshot: square framing, subtle 1px muted border, no
 *     offset shadow, no bright ring.
 *   • Plain underlined-text links for the two CTAs instead of filled
 *     buttons. Less chrome.
 *
 * Everything else stays Inter at body weight. No cobalt anywhere.
 */
export function Hero() {
  return (
    <section className="space-y-10 pt-2">
      <div className="grid grid-cols-1 items-center gap-x-12 gap-y-8 md:grid-cols-[auto_1fr]">
        {/* Headshot — clean, no shadow, no accent ring */}
        <Image
          src="/headshot.JPG"
          alt="Rishi Patel"
          width={160}
          height={160}
          priority
          className="h-[128px] w-[128px] rounded-full border border-border object-cover md:h-[156px] md:w-[156px]"
        />

        {/* Name + intro */}
        <div className="space-y-5">
          <h1 className="text-5xl font-black leading-[1] tracking-tight text-foreground/90 md:text-[5.25rem]">
            Hi, I&apos;m <span className="highlight">Rishi Patel</span>
          </h1>
          <p className="max-w-2xl text-lg leading-snug text-foreground/85 md:text-xl">
            I work with executives to ship AI use cases that move real
            numbers. By day I&apos;m on the business planning team at a
            public company, reporting to the Chief Business Officer. On
            the side I build customer-facing AI for small businesses. Open
            to AI deployment roles.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        <a
          href="#audit"
          className="text-base text-foreground underline decoration-accent decoration-2 underline-offset-[6px] transition-colors hover:text-accent"
        >
          Try the live audit
        </a>
        <span aria-hidden className="text-muted-foreground/40">
          /
        </span>
        <a
          href="#ask"
          className="text-base text-foreground underline decoration-accent decoration-2 underline-offset-[6px] transition-colors hover:text-accent"
        >
          Ask me anything
        </a>
      </div>
    </section>
  );
}
