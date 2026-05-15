import { SectionHeader } from "@/components/section-header";

export function About() {
  return (
    <section className="space-y-8">
      <SectionHeader
        number="01"
        label="About"
        meta="Decade in operations + analytics"
      />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="font-display text-2xl leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          I&apos;ve spent a decade in operations and analytics across
          founding teams, growth stage marketplaces, and now a public
          company. The shape of the work has stayed roughly the same:
          finding the slow part of someone&apos;s day and making it less
          slow.
        </p>

        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Right now I sit on the business planning team at a public
            company, reporting to the Chief Business Officer. The day to
            day is dashboards and the weekly business review the exec
            team uses to track the initiatives they&apos;ve set, plus
            the sanity check work that catches bad numbers before they
            hit a slide.
          </p>
          <p>
            On top of the core role I&apos;ve built a couple of AI tools
            to do more of the job in less time. The first is a Claude
            Code script that automates most of the weekly business
            review, turning the half day cycle that used to eat a Monday
            into a 30 minute review and edit. The second is an early
            warning system that flags accounts at risk before they
            churn, by watching contract pattern shifts year over year
            and trailing twelve month behavioral changes, then surfacing
            them on Power BI dashboards used across the field. Account
            managers see today&apos;s at risk accounts, district leads
            see the district roll-up of healthy, watching, at risk, or
            churned, regional VPs see their region, execs see the
            company wide health split.
          </p>
          <p>
            Earlier I spent four years at RippleMatch in NYC as Senior
            Operations Manager on the growth team. The marketplace
            4×&apos;d while I was there and went from two verticals to
            eight. Before that I cofounded a clean energy hardware
            company called Triton Solar, where I ran operations and GTM
            and dealt with international supply when nobody else could.
          </p>
          <p>
            What pulled me into AI specifically is that the build cost
            finally dropped to something I could afford on a weekend.
            The kinds of small tools I&apos;ve always wanted to make,
            the ones that take a manual workflow and quietly do it in
            the background, used to need engineering. Now they need a
            prompt and an evening. I&apos;ve spent the last two years
            building inside that change, for this company and a few
            small business clients, mostly to see how far the new tools
            actually go before they break.
          </p>
          <p>
            Half of that work is the build. The other half is the part
            most AI engagements skip: teaching the owner how the tool
            actually does what it does, and giving them a way to change
            it without breaking it. I keep a small reusable set of
            scripts for the second half, including a prompt generator
            that lets someone who doesn&apos;t code tweak the AI&apos;s
            behavior on a config file instead of in production. Whether
            an AI tool is still being used six months after I leave
            usually comes down to whether that second half got done.
          </p>
        </div>
      </div>
    </section>
  );
}
