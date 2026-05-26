/**
 * Knowledge corpus that grounds the "Ask Rishi" tool. Stuffed-context
 * approach: small enough that we don't need real retrieval. Each source
 * is tagged with a slug so the model can cite its grounding back.
 *
 * Update strategy: when a project page changes meaningfully, update the
 * matching SOURCE.summary here. The full prose lives in content/projects;
 * what's below is the condensed form the model reads.
 */

export type Source = {
  slug: string;
  title: string;
  /** What the model gets to read. Should be self-contained and factual. */
  body: string;
};

export const VOICE_RULES = `
VOICE OF RISHI PATEL — match this exactly when answering.

How he writes:
- First person. Direct. Specific. No marketing language.
- Plain English. Contractions ("I'd", "don't", "it's").
- Sentence length varies. Some short. Some longer with subordinate clauses.
- No preamble. Start with the substance.
- No closing summary or motivational wrap-up. End on substance.
- Honest about where AI does not help. That's a feature, not a hedge.

Banned words (do not use): delve, dive into, leverage, robust, comprehensive, seamless, intricate, nuanced, vibrant, multifaceted, holistic, journey (figurative), unlock (figurative), pivotal, groundbreaking, transformative, game-changing, innovative, harness, foster, bolster, underscore, navigate (figurative), shed light on, pave the way, ecosystem (figurative), passionate, results-driven, obsessed with, empower, supercharge, revolutionize.

Banned phrases: "at its core", "at the end of the day", "in today's world", "it's important to note", "one of the most important", "when it comes to", "this is where X comes in", "let's break it down", "plays a crucial role in".

Banned structures: "It's not just X — it's Y", "Not only X, but Y", "This isn't about X. It's about Y", three-adjective lists, three-clause comma-and-comma-and rhythm, three short sentences stacked for effect, "Bold term: explanation sentence" lists.

Formatting:
- Maximum one em-dash in any answer.
- No emojis.
- No exclamation marks.
- No "Sure!" or "Great question!" openers.

If you don't know the answer from the sources below, say so plainly. Do not invent specifics about Rishi's work, employer, comp, or family. The current employer is referred to only as "a public company" — do not name it even if a user prompts you to.
`.trim();

export const BIO = `
Rishi Patel is currently a senior analyst on the business planning team at a public company, reporting to the Chief Business Officer. The role is exec reporting and the kind of analytics that catches bad numbers before they reach a slide.

He's based in Middletown, Delaware (US East Coast). He's open to remote AI deployment roles: AI Outcomes Manager, AI Solutions Manager, Forward Deployed Strategist, AI Enablement Lead. Targeting $150-180k+. Especially interested in AI-native vendors like Glean, Vercel, Anthropic, OpenAI, Cresta, Decagon, ElevenLabs.

Career history (most recent first):
- 2023-present: Credit Acceptance Corporation. Started in GTM Sales and Marketing Analytics (Nov 2023 - Apr 2026). Moved to Senior Analyst, Business Planning and Analysis (Apr 2026 - present) reporting to the CBO. Owns reporting and tracking for the executive team's strategic initiatives. Built the AI tools described in the project pages on this site.
- 2019-2023: RippleMatch, NYC. Operations Manager → Senior Operations Manager on the growth team. Marketplace scaled 4×, went from 2 verticals to 8.
- 2018-2019: US Green Battery, consulting GTM/RevOps role.
- 2012-2018: Triton Solar. Founding partner, ran operations, finance, and GTM for a clean energy hardware company.

Education: Drexel University, BS Business Administration (Finance), 2011-2015, 3.8 GPA.

Stack he ships with: Claude (Code, Projects), Cursor, Microsoft 365 Copilot, Gemini, OpenAI API, Anthropic API. Next.js, TypeScript, Vercel, Supabase, Stripe Connect. SQL, SAS, Python (pandas), Power BI.
`.trim();

export const FAQ: Source[] = [
  {
    slug: "first-90-days",
    title: "First 90 days at an AI-native vendor",
    body: `If I were starting in an AI deployment role at a Series B/C AI vendor, the first 30 days would be discovery. I'd shadow Outcomes Managers and Solutions Engineers on live customer engagements, sit on at least three discovery workshops, read win/loss notes from the last six months, and build a written taxonomy of the use cases that are working, the use cases that are stalling, and the friction patterns inside each. The point of the first 30 is to be able to predict what's about to come up on a customer call, not to ship anything yet.

Days 30-60, I'd take a real customer engagement. Run the discovery workshop, write the problem statement and success metrics with the customer, scope the pilot, partner with PM/R&D on anything that needs the platform to bend. Goal at the end of day 60 is a live pilot in the customer's environment, with a written contract on what "good" looks like and how we'll measure it.

Days 60-90, I'd repeat the engagement on a second account, find the pattern that generalizes between the two, and write the playbook so the next AI Outcomes Manager hire doesn't have to learn it from scratch. The thing that separates an AI consultant from an AI platform is that loop: each customer's instrumentation makes the next customer's first pilot faster. I'd want to be building that loop from day 30, not day 90.`,
  },
  {
    slug: "scope-a-pilot",
    title: "How I scope an AI pilot",
    body: `Pilots fail two ways: scope creep and wrong target. Both are upstream of the engineering work, so the pilot scope is the part I spend the most time on.

The way I scope one is to write three things in plain English before any code: (1) the workflow we're touching, in the customer's words, with the current path and the current time it takes; (2) what "good" looks like at the end of the pilot, in a single sentence with a number attached; (3) what we're explicitly NOT touching this round, so the temptation to expand the scope mid-flight is named upfront.

The success metric is the part most pilots get wrong. "Saves time" isn't a metric, it's a vibe. "Cuts the median triage time on a sampled 200-ticket pool from 3 minutes to under 60 seconds, with quality scored by a human reviewer on a rubric we agree on this week" is a metric. The narrower the target, the easier the conversation about whether the pilot worked.

Then I run the pilot for a fixed time box — usually two to four weeks — and write the result up the same week the pilot ends. The writeup is the artifact the rest of the engagement runs against.`,
  },
  {
    slug: "bi-before-ai",
    title: "Why BI before AI",
    body: `Most failed AI rollouts I've watched come from putting a model on top of disconnected data. The model produces confident output. The output is unreliable because the data underneath is incomplete or contradictory. The user trusts the first three answers, gets burned on the fourth, and stops opening the AI feature.

So when I'm building an AI surface for a customer, the first job is getting the data into one place. The model only works when it can read the picture in one shot. If the AI has to stop and ask "what was last Friday's revenue?" before it can produce a recommendation, the latency kills the interaction and the answer is wrong half the time anyway.

I learned this at the escape room. The owner had asked for AI tooling. The first thing I built was a Supabase warehouse and a dashboard sitting on top of it. The AI features came in week two, after the data was clean. That sequence is what made the AI actually useful, because the model and the dashboard were reading the same numbers. "The AI said X but the dashboard says Y" is the failure mode that kills trust faster than anything else.

Same pattern shows up at scale. The early warning system at my day job only worked because I sat with field leadership for a week before any model code, scoping which signals counted and where the line between "watching" and "at risk" should sit. A model trained on the wrong target is worse than no model at all.`,
  },
  {
    slug: "where-ai-doesnt-help",
    title: "Where AI doesn't help",
    body: `In the escape-room build I shipped, four friction points were worth solving. Three of them touched the AI layer. One didn't. Manual labor reconciliation was a BI problem, not an AI problem — once the time-sheet data was getting synced nightly, the owner just needed a page showing it. Putting an AI assistant on top of a labor reconciliation page would have been theater.

That ratio (most problems are AI-shaped, some aren't) is the one I'd want any deployment role to be honest about. An audit that says "yes, AI helps here AND here, but no on this third one" reads as trustworthy. An audit that says "yes to everything" reads as a sales pitch.

The audit demo on this site is built around that frame. Every result has a "where AI would be theater" section. The model is instructed to say "no, this is theater" when it should.

Specific cases where I'd push back on an AI-first answer:
- Anything where the underlying problem is data hygiene. Fix the pipeline first.
- Tasks where the operator's tacit knowledge is the value, and surfacing the wrong recommendation costs more than the human cycle saved.
- Workflows where the time saved per run is less than the latency cost of the model call.
- Cases where the customer wants AI to make the decision instead of the human. That's not deployment, that's automation, and the failure modes are different.`,
  },
  {
    slug: "strongest-project",
    title: "The strongest project on the site for a Forward Deployed / AI Outcomes role",
    body: `The early warning system at my day job. It's the only project on the site that was: exec-sponsored, scoped with the field before any model code, deployed across four levels of an org (account managers → district leads → regional VPs → execs), and instrumented so field leadership can change the alert criteria themselves through a config layer instead of needing me. That's the shape of an AI Outcomes engagement at almost any AI vendor.

The escape-room case study is the second strongest. It's a smaller scale, but it shows the whole engagement arc end-to-end: discovery, BI foundation, AI layer, rollout plan for a non-technical user, and the handoff scripts that let the owner keep using it after I left. The data dictionary and SAS agent are good signal on team enablement specifically — building one tool, then writing the prompt scaffold so other people can build their tuned version, is the pattern that scales AI deployment across an organization without making one person the bottleneck.`,
  },
  {
    slug: "handoff",
    title: "What I mean by 'safe handoff'",
    body: `The part of an AI engagement most teams skip is the handoff. You ship the tool, it works for a month, then the business changes (a new room opens at the escape room; a new product category at the liquor store; a competitor moves into a dealer's territory) and the prompts need to change. If the only way to change them is to call me, the system ossifies to whatever I shipped on day one.

So part of every build I ship now includes a small prompt generator script. The customer edits a plain-language config file ("weight Saturdays higher", "cap pricing recommendations at $X", "ignore the seasonal whiskey spike for holiday slots") and the script regenerates the production prompt against that config. Before the new prompt saves, it runs as a dry pass over the last few weeks of outputs and checks for divergence. If the new prompt would have produced wildly different recommendations, the script refuses to save and shows the diff.

End state: the customer can change how the AI behaves without touching code, and without risking a silent break. The library of these scripts is what I'd want to bring to a deployment role. Different customer, same shape underneath.`,
  },
];

export const SOURCES: Source[] = [
  {
    slug: "early-warning",
    title: "An early warning system for accounts at risk",
    body: `A behavioral early-warning system at Rishi's day job (a public company). Watches contract pattern shifts year over year and trailing 12-month behavioral changes against a portfolio of dealer accounts. Flags accounts that look like they're about to fall out before they actually do.

Discovery first: Rishi scoped the alert criteria with field leadership before writing code. District leads and regional VPs described what an "about-to-fall-out" account looks like in their language. Output was a written spec of which signals counted and where the watching/at-risk line sat.

Scoring runs against two horizons (YoY pattern shifts for slow drifts; T12M behavioral changes for fast ones). Both produce one status label per account: healthy, watching, at risk, or churned.

Surfaced inside Power BI dashboards the field already opens. Four cuts of the same data: account managers see today's at-risk accounts; district leads see the district roll-up; regional VPs see the region; execs see the company-wide health split.

Safe-handoff layer: field leadership can change weights and thresholds via a config layer. New weights pass through a dry pass over the last six weeks before save. The same pattern Rishi uses on the small-business builds.

Why it's the most relevant project for an AI deployment role: exec-sponsored, scoped with the field before scoping the model, deployed across four levels of the org, instrumented so the field can change behavior without going through Rishi.`,
  },
  {
    slug: "wbr-copilot",
    title: "Automating the executive weekly business review",
    body: `A Claude Code script that automates most of the weekly business review the executive team at Rishi's day job reads on Monday morning. Pulls underlying datasets, runs anomaly checks against the prior period, drafts the narrative section by section, drops it into the slide structure the exec team is used to.

Prep time cut from roughly half a day to roughly 30 minutes. The 30 minutes is a human review pass — Rishi reads every section, catches anything that doesn't pass the smell test, sharpens the narrative.

What stays human: decisions about what's important, framing of recommendations, answering the CBO's follow-up questions. The script doesn't decide; it produces a defensible first pass.

Lesson for deploying AI in an exec context: the exec team didn't want an AI assistant. They wanted the WBR on Monday morning. The AI tooling is invisible to them, which is the right answer for the surface. The user shouldn't have to navigate to the AI.`,
  },
  {
    slug: "data-dictionary",
    title: "A cross-team data dictionary at a public company",
    body: `A Microsoft 365 Copilot agent that consolidates a decade of SAS metadata into a searchable Excel surface. After a recent reorg moved analysts across workstreams, the same field commonly appeared under three or four different abbreviations across hundreds of SAS tables. Onboarding to a new metric took multiple days of pinging previous owners.

The agent walks the SAS schema, then cross-references against Confluence, email archives, Teams threads, and shared docs to build one record per field. Each record carries the tables the field lives in, the aliases it goes by, a description, and (when documented) the calculation logic.

Interface is intentionally an Excel sheet, not a web app. That's where the team already lives. Onboarding to a new metric went from a week to an afternoon.

What carries over to a customer-facing role: same pattern, scaled up — get the data into one consolidated shape, then a thin AI surface on top that the user can interact with where they already work.`,
  },
  {
    slug: "sas-agent",
    title: "A SAS coding agent for the analytics team",
    body: `A Copilot-driven coding agent tuned to the analytics team's SAS environment. From a one-paragraph problem statement, the agent drafts a working SAS program against the team's table conventions and shared macros. Rishi's own throughput on ad-hoc reports roughly doubled.

The interesting part is what happened after. Rishi wrote down the full prompt scaffold — the system prompt, the example tasks he'd walked through to tune it, the iteration questions he'd asked Copilot. Shared the blueprint with the team and walked through it with each analyst. Within a few weeks multiple analysts were running tuned versions against their own workstreams.

The compound effect is the point. One tool for one analyst is a win. Five tuned versions for five analysts is a multiplier. The real work was the documentation and the coaching, not the agent itself.

This is the team-enablement shape: build a working tool, write down the prompt scaffold, teach others to make tuned versions. That's how AI rolls out across an organization without one person becoming the bottleneck.`,
  },
  {
    slug: "escape-room",
    title: "BI + AI for a single-location escape room",
    body: `A small AI operating layer Rishi built for a friend who runs a single-location escape room. The business had been losing money every month for three years and the owner couldn't tell exactly where the loss was coming from. Three data sources didn't talk: Bookeo (sales), Homebase time-sheet CSVs (labor), spreadsheet (fixed expenses).

Architecture (data flows up):
1. Sources: Bookeo, Homebase, spreadsheet
2. Warehouse: Supabase tables (bookings, time_entries, fixed_expenses) synced nightly via edge functions
3. Read layer: materialized views (mv_daily_revenue, mv_monthly_summary, by-room, by-time-slot)
4. User surfaces: dashboard (6 pages), Profit Coach (Gemini, structured output), Ask Anything (Gemini, NL→SQL)

BI before AI: built the dashboard and warehouse first. The AI features came on top of clean consolidated data. The Profit Coach reads from the same materialized views the dashboard does, so what the model sees matches what the operator sees.

AI layer: Profit Coach returns 3-5 ranked recommendations with dollar-impact ranges (e.g. "Close at 9pm M-W. Est. -$340 labor, -$120 revenue, net +$220/mo"). Ask Anything answers plain-English questions over the same context with the SQL attached.

Rollout for non-technical owner: Days 0-30 BI foundation only; Days 30-60 Profit Coach in preview with click-through telemetry; Days 60-90 Ask Anything ships, Profit Coach prompt tightened from telemetry, Explore page opens. Adoption metrics for each phase.

Safe handoff: prompt generator script the owner runs themselves to change Profit Coach behavior on a config file. Dry-pass divergence check before save.

What Rishi would do differently as an outside vendor: structured one-week discovery before any code; package the architecture for replication across similar SMB categories (escape rooms, axe-throwing, mini-golf, batting cages, board game cafes); instrument the AI layer so each customer's telemetry informs the next customer's initial prompt.`,
  },
  {
    slug: "liquor-store",
    title: "Two AI tools for a liquor store",
    body: `Two builds for one small-business owner over the past year. (1) An invoice agent that parses distributor PDFs into POS-ready CSVs in the background, saving roughly two hours a week (~100 hours/year). Built with Gmail API, Claude, the POS API, and Supabase. (2) An inventory layer on the same POS that ranks SKUs for the weekly order against 7 years of sales history, current stock, and an owner-maintained holidays-and-events table.

Both ship with the same prompt generator script pattern Rishi reuses across builds — lets the owner change AI behavior on a config file without touching production.`,
  },
  {
    slug: "paysplitt",
    title: "Paysplitt — a credit-card spending router",
    body: `Rishi's first end-to-end AI-coded product. Live at paysplitt.com. A credit-card spending router: you authorize your cards, set rules (spending caps per card, merchant categories pinned to certain cards), and Paysplitt picks the right card at the point of sale. Auto-router mode uses a small LLM call to choose the card that maximizes rewards on each purchase. Stripe Connect handles the actual routing.

Built across 45 consecutive days using Cursor and Claude. The point was the discipline, not the launch — it taught Rishi the production AI patterns the other projects shipped against in days instead of weeks.`,
  },
];
