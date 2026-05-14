import { SectionHeader } from "@/components/section-header";

export function About() {
  return (
    <section className="space-y-8">
      <SectionHeader number="01" label="About" meta="Ten years operating" />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="font-display text-2xl leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          I&apos;ve spent about a decade in startup ops and GTM roles,
          across a couple of growth-stage companies and one I
          co-founded.
        </p>

        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Right now I&apos;m doing GTM analytics at Credit Acceptance,
            reporting to the Chief Business Officer. Before this I spent
            four years at RippleMatch in NYC as a Senior Operations
            Manager on the growth team. The marketplace roughly 4×&apos;d
            while I was there and we went from two verticals to eight.
            Earlier than that I co-founded a clean-energy hardware company
            called Triton Solar, where I ran operations and GTM and dealt
            with international supply when nobody else could.
          </p>
          <p>
            What pulled me into AI was being the person who keeps
            noticing the spreadsheet everyone is suffering through and
            asking why nobody has fixed it. For the past two years most
            of my nights have been spent fixing exactly those, mostly for
            small-business clients but also for myself.
          </p>
          <p>
            Half of that work is the build. The other half is the part
            most AI engagements skip: teaching the owner how the tool
            actually does what it does, and giving them a way to change
            it without breaking it. I keep a small reusable set of
            scripts for the second half, including a prompt generator
            that lets a non-coder tweak the AI&apos;s behavior on a
            config file instead of in production. Whether an AI tool is
            still being used six months after I leave usually comes
            down to whether that second half got done.
          </p>
          <p>
            What I want next is a role centered on applied AI: figuring
            out which AI work would actually move a number for the
            people doing the work, then leading it through to shipped
            and adopted.
          </p>
        </div>
      </div>
    </section>
  );
}
