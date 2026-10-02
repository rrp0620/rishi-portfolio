import { SectionHeader } from "@/components/section-header";

/**
 * About. Three paragraphs, current work first. Background last. Replaces
 * the previous six-paragraph version that buried the day-job AI work in
 * paragraph three.
 */
export function About() {
  return (
    <section className="space-y-8">
      <SectionHeader label="About" meta="A decade in operations and analytics" />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="text-2xl font-semibold leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          I find the slow part of someone&apos;s day, and ship the AI that
          makes it less slow.
        </p>

        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Right now I&apos;m a Business Performance Analyst at a public
            company. I was the first hire on a new Business Performance team
            inside business planning, reporting to the Chief Business
            Officer. The role is
            the usual mix of executive reporting and the kind of analytics
            that catches bad numbers before they reach a slide. The
            interesting half is what&apos;s been built on top of that role:
            a Claude Code script that automates the executive weekly
            business review, an early warning system that watches contract
            pattern shifts and flags accounts at risk before they churn, a
            Microsoft 365 Copilot agent that consolidates a decade of SAS
            metadata into a searchable dictionary, and a SAS coding agent
            now running in tuned versions across the analytics team.
          </p>
          <p>
            On the side I&apos;ve built customer-facing AI for an escape
            room owner trying to stop losing money, a liquor store working
            through distributor invoices manually every week, and a
            fintech side project called Paysplitt. Same
            methodology each time: shadow the actual workflow, get the
            data into one shape, then put a thin AI layer where the user
            already works. The part most engagements skip is the handoff.
            I keep a small set of scripts that let a non-technical owner
            tune the AI&apos;s behavior on a config file instead of in
            production.
          </p>
          <p>
            Before this I spent four years on the growth team at
            RippleMatch, scaling a marketplace 4× and expanding it from two
            verticals to eight. I led the Salesforce implementation there,
            built a lead-scoring formula in Salesforce with the BD leads and
            sales execs, and used Apollo to source and enrich leads for
            supply-side acquisition. Earlier I cofounded Triton Solar, a clean
            energy hardware company where I ran operations and GTM and
            handled international supply.
          </p>
        </div>
      </div>
    </section>
  );
}
