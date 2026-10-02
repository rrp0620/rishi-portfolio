"use client";

import Image from "next/image";

/**
 * Hero — Gloria Lo direction translated to dark.
 *
 *   • Heavy Inter 900 for "Hi, I'm Rishi Patel" (one typeface across the
 *     whole site, weight does the hierarchy work).
 *   • Warm amber marker-highlighter behind the name, drawn across the
 *     lower 60% of the text via .highlight (linear-gradient trick).
 *   • Headshot: clean circle, 1px muted border, no shadow.
 *   • Two CTAs: "Try the live audit" anchors to the audit demo. "Ask me
 *     anything" dispatches a custom event that the floating chat bubble
 *     (mounted in layout.tsx) listens for and opens its panel.
 */
export function Hero() {
  function openAsk(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-ask-rishi"));
  }

  return (
    <section className="space-y-10 pt-2">
      <div className="grid grid-cols-1 items-center gap-x-12 gap-y-8 md:grid-cols-[auto_1fr]">
        <Image
          src="/headshot.JPG"
          alt="Rishi Patel"
          width={160}
          height={160}
          priority
          className="h-[128px] w-[128px] rounded-full border border-border object-cover md:h-[156px] md:w-[156px]"
        />

        <div className="space-y-5">
          <h1 className="text-5xl font-black leading-[1] tracking-tight text-foreground/90 md:text-[5.25rem]">
            Hi, I&apos;m <span className="highlight">Rishi Patel</span>
          </h1>
          <p className="max-w-2xl text-lg leading-snug text-foreground/85 md:text-xl">
            I build the systems and AI workflows behind revenue numbers:
            lead scoring and routing, data quality, and executive
            reporting. By day I&apos;m a Business Performance Analyst at a
            public company, the first hire on a new team inside business
            planning, reporting to the Chief Business Officer. On the side
            I build customer-facing AI for small businesses. Open to GTM
            Engineering and AI deployment roles.
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
          onClick={openAsk}
          className="text-base text-foreground underline decoration-accent decoration-2 underline-offset-[6px] transition-colors hover:text-accent"
        >
          Chat with me
        </a>
      </div>
    </section>
  );
}
