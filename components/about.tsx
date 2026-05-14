import { SectionHeader } from "@/components/section-header";

export function About() {
  return (
    <section className="space-y-8">
      <SectionHeader number="01" label="About" meta="Applied AI · BPA" />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="font-display text-2xl leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          I work on applied AI at a public company. My job is finding
          where models actually move a number and getting the tools
          shipped and used.
        </p>

        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            I sit on the business planning team, reporting to the Chief
            Business Officer. I moved here in April from another
            analytics role inside the same company. The two main
            projects since: automating the weekly business review
            through a Claude Code script, and building an early-warning
            system that flags accounts at risk before they churn. The
            early-warning piece watches contract-pattern shifts
            year-over-year and trailing-twelve-month behavioral
            changes, then surfaces them on Power BI dashboards used
            across the field. Account managers see which accounts to
            focus on today; district leads see the district roll-up of
            healthy, watching, at-risk, or churned accounts; regional
            VPs see their region; execs see the company-wide health
            split.
          </p>
          <p>
            Earlier than this I spent four years at RippleMatch in NYC
            as Senior Operations Manager on the growth team. The
            marketplace 4×&apos;d while I was there and went from two
            verticals to eight. Before that I co-founded a clean-energy
            hardware company called Triton Solar, where I ran
            operations and GTM and dealt with international supply when
            nobody else could.
          </p>
          <p>
            What pulled me into AI was being the person who keeps
            noticing the spreadsheet everyone is suffering through and
            asking why nobody has fixed it. I&apos;ve spent the last two
            years fixing exactly those, at this company and for a few
            small-business clients. The toolchain shifts every couple
            weeks and I want to know what&apos;s actually possible with
            it, not what&apos;s getting marketed.
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
