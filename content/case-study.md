# From Spreadsheet to System: Building an AI Operating Layer for an Escape Room

**Author:** Rishi Patel
**Status:** Complete draft (all 6 sections; appendix items still pending)
**Read time:** ~8 min
**Companion artifact:** [Loom walkthrough — coming with Deliverable 2]

---

## TL;DR

A small escape room business — three years in, ~5,000 bookings, persistently losing money each month — was running on Bookeo, a time-sheet CSV, and the owner's gut. We built an AI-augmented operating layer on top: a Supabase-backed dashboard that consolidates revenue, labor, and fixed expenses; a Gemini-powered "Profit Coach" that reads the consolidated context and produces ranked, dollar-impact-quantified recommendations; and an "Ask Anything" box that lets the owner query their business in plain English. This case study walks through the workflow, the friction, the architecture, and what an outside vendor would do to take this from prototype to production at scale.

---

## Outline

1. **The business** — what it is, who runs it, what decisions get made weekly
2. **Where it bleeds** — five frictions the owner can't engineer around alone
3. **The BI foundation** — what we shipped first, and why the dashboard had to come before the AI
4. **The AI layer** — Profit Coach + Ask Anything, friction-to-AI mapping, prompt/context architecture
5. **Rollout plan** — 30 / 60 / 90 for adoption with a non-technical owner
6. **What I'd do differently as an outside vendor** — the FDE-perspective close

---

## 1. The business

A 4-room escape room operating out of a single physical location. Three years of operating history, roughly 5,000 paid bookings on the books, and lifetime revenue in the mid-six figures. One owner-operator. Three part-time employees on hourly pay; the lead host also earns a tiered revenue bonus (5% on the first marginal $1K of monthly revenue past a threshold, 6% on the next, and so on).

The owner's week looks like this:

- **Monday morning.** Open Bookeo, the booking platform, and try to figure out how last week did. Compare against a mental benchmark.
- **Mid-week.** Decide whether to run a promo, push social, or sit tight. The decision is made on feel.
- **End of pay period.** Open a spreadsheet, manually pivot a time-sheet CSV per employee, calculate payroll, compute the lead host's bonus tier, hope the math is right.
- **Month-end.** Reconcile fixed expenses (rent, insurance, software, utilities) against revenue from Bookeo. Mentally guess if the month was profitable. Often find out three weeks later that it wasn't.

This is a margin-sensitive business running a small persistent monthly loss. Not catastrophic — but persistent enough that getting to profitability is *the* operating question. Every other decision is downstream of one underlying gap: **the owner can't see profitability in real time, so by the time they react, the bad month is already booked.**

That's the workflow this case study is about.

---

## 2. Where it bleeds

Four frictions, ranked by the operating cost they impose on the owner.

**1. No real-time visibility into profitability.**
Revenue lives in Bookeo. Fixed expenses live in a spreadsheet. Labor lives in a time-sheet CSV that gets imported manually every two weeks. To answer "are we profitable this month?" the owner has to consolidate three sources by hand, which means they answer it monthly at best, often a month late. By the time they realize they're underwater, the month is closed.

**2. Manual labor cost reconciliation.**
The time-sheet CSV is the bottleneck. Each pay period the owner pivots it from a wide format ("rows = employees, columns = pay periods 4 through 44") into something usable, then multiplies by hourly rates, then totals it for the month. Twenty minutes of work, every two weeks, prone to errors, and never current. Labor costs are always 1 to 14 days stale.

**3. No structured way to answer ad-hoc business questions.**
*"What's our Saturday average ticket?"* *"Which game room has the worst average party size?"* *"What's our break-even revenue per day in April?"* These are exactly the questions an owner needs to answer to find profit levers, and there is no system that answers them. The data is in Bookeo and the spreadsheet, but the owner doesn't write SQL and isn't going to learn.

**4. No anomaly detection.**
A bad week looks like a normal week until you compare it against the same week last year, or against your weekly target. Without a target system, every week is "fine." A 25% drop on Saturday afternoons gets noticed only when the month closes, or sometimes not at all.

The unifying problem is not any one of these. It's that the owner is trying to run a margin-sensitive business **without a feedback loop that closes faster than a month.** That's the gap an AI-augmented operating layer can close, and that's what we built.

---

## 3. The BI foundation

The first decision was to build the dashboard before the AI layer.

This was contentious. The owner asked for AI tooling. They wanted Profit Coach. What I built first was the boring part: a consolidated database of bookings, labor, and fixed expenses, with a handful of dashboard pages on top.

Here's why. Profit Coach needs context to be useful. If the model has to ask "what was last Friday's revenue" before making a recommendation, the latency kills it and the answer is wrong half the time. The model becomes useful when it can read the full picture in one shot — when revenue, labor, fixed expenses, monthly target, and historical patterns are all sitting in the same place, in the same shape, refreshed daily. AI on top of disconnected data is just confident-sounding noise. The first job was getting the data into one place.

So that's what we built.

**Data layer.** Bookeo is the booking system, so every paid booking lives there. We wrote an edge function called `bookeo-sync` that pulls bookings into a Supabase database every morning via pg_cron. Labor data lives in a CSV the owner uploads from their old time-tracking system; we wrote a `homebase-sync` function for when they switch to Homebase, which is the proper-source-of-truth fix. Fixed expenses (rent, insurance, software, utilities) live in a `fixed_expenses` table, editable inline from the Break-even page so the owner can update them without touching a spreadsheet.

On top of the raw tables, we built a few materialized views: `mv_daily_revenue` for the per-day rollup, `mv_monthly_summary` for the month-level numbers, and a couple of cohort views for the by-room and by-time-slot cuts. These exist for two reasons. The dashboard renders fast because it reads pre-aggregated views, not raw bookings. And the AI context object is cheap to assemble. Profit Coach reads from the same views the dashboard does, so what the model sees and what the owner sees are the same numbers.

**Dashboard pages.** Six pages, in priority order:

- **Overview.** The Monday-morning page. Last week's revenue, run-rate to monthly target, top-line P&L, and the AI Insights card.
- **Revenue.** Drill-down by day, room, and time slot. Used for "where did the money come from this month."
- **Year.** Twelve-month rollup with editable monthly revenue targets. The owner sets a target for each month and the page tracks against it.
- **Explore.** A real BI tool. Pick a metric, group by something, filter by something else, share a URL, export CSV. This is the page that replaces "can you pull this for me" Slack messages.
- **Break-even.** Fixed expenses on the left, revenue required to break even on the right, broken down per day. Editable in place.
- **Bonus tracker.** Lead host bonus calculation, automated based on monthly revenue.

Each page took about half a day. The architecture took most of week 1. By the end of week 1, the owner had real-time visibility for the first time. The AI features came later, on top.

The thesis behind this section: the BI work is what makes the AI work credible. Without it, the model is guessing. With it, the model is reading the same numbers the operator is.

---

## 4. The AI layer

With the data consolidated, the AI layer becomes a thin shell. Both AI surfaces — Profit Coach and Ask Anything — read from the same context object: a JSON blob assembled from the materialized views. Hour-of-day patterns. Day-of-week patterns by season. Fixed expenses. Cancellation rate. Monthly target. Current-month run rate. Room mix.

Two surfaces, two distinct jobs.

**Profit Coach.** Structured-output mode. The model receives the context object and returns 3 to 5 ranked recommendations, each with an estimated dollar-impact range per month. The output is constrained to actionable levers, not vague suggestions. Sample outputs from the live system:

- "Close at 9pm Monday through Wednesday. Estimated -$340 labor cost, -$120 revenue, net +$220 per month."
- "Shift Game Room A pricing from $32 to $36. Estimated +$280 to +$420 per month based on price-elasticity inferred from current bookings at the $30 promo rate."
- "Cancel [software vendor] subscription. Estimated +$110 per month, no operational impact based on the past 90 days of usage."

These show up as a card on the Overview page. The owner sees them every Monday morning. Each recommendation has a "details" expander with the underlying numbers.

**Ask Anything.** Free-text Q&A. Same context object, different interface. The owner types a question in plain English. The model returns a grounded answer with the source view linked alongside, so the owner can verify before acting.

Examples that have come up in real use:

- "What's our break-even revenue per day in April?"
- "Which game room has the worst average party size?"
- "What's our Saturday afternoon trend over the last six months?"

These would have been "can you pull this for me" Slack messages. Now they're 5-second answers, with the SQL attached if the owner wants to verify.

**Friction-to-AI mapping.** Mapping the four frictions from Section 2 to the AI layer:

- **No real-time profit visibility** is solved primarily by the BI dashboard, with Profit Coach as the prescription layer that interprets what the dashboard surfaces.
- **Manual labor cost reconciliation** is solved by the BI layer alone. The AI doesn't need to be involved.
- **No structured way to answer ad-hoc questions** is solved by Ask Anything.
- **No anomaly detection** is solved by Profit Coach, which surfaces "this slot is underperforming" the moment the run-rate diverges from target.

Three of the four frictions get touched by the AI layer. One doesn't need it. That's the right ratio. Not every operating problem is an AI problem.

**Two intentional non-goals.** First, the AI doesn't auto-execute anything. No automatic price changes, no automatic schedule edits. The owner stays in the loop on every decision. Second, we didn't chat-ify the dashboard. There's no separate "AI assistant" tab. The AI shows up where the owner is already looking, on the Insights card on the Overview page, not as a feature you have to navigate to. AI as a feature inside the workflow, not as a workflow you have to enter.

The Loom walkthrough at the top of this page shows both surfaces running on a real data shape.

---

## 5. Rollout plan

Adoption matters more than features. A great dashboard nobody opens is a worse outcome than an okay dashboard the owner uses every day.

The rollout was designed for one non-technical user with limited time. Three phases.

**Days 0 to 30.** Ship the BI foundation only. No AI yet. The goal is muscle memory.

Train the owner on three pages: Overview (Monday morning), Year (monthly target setting), and Break-even (fixed expense management). Skip Explore for now. It's the most flexible page but also the most overwhelming, and overwhelming a non-technical user kills adoption.

Adoption metrics for this phase: login frequency and Break-even page edits. The owner should be opening the Overview every Monday and editing the Break-even page at least once a month. If those two things happen consistently, the BI layer is sticking.

**Days 30 to 60.** Introduce Profit Coach in preview mode.

Recommendations show up on the Overview page, flagged "AI suggestion — read before acting." Each one expands to show the underlying numbers and the assumptions. The owner can dismiss recommendations they disagree with. We track which recommendations the owner clicks into and which they ignore.

This data tightens the next prompt revision. Recommendations that get ignored every time are usually wrong-shaped: wrong threshold, wrong scale, wrong tone. Recommendations that get clicked but not acted on are usually right-shaped but wrong-sized. We use both signals to shape the prompt.

Adoption metric for this phase: click-through rate on AI recommendations. If the owner clicks zero of them in week 4, something's wrong with the recommendations, not with the owner.

**Days 60 to 90.** Ship Ask Anything. Tighten Profit Coach prompts based on the click-through patterns. Introduce the Explore page now that the owner has confidence.

Adoption metric for this phase: questions asked per week in Ask Anything. This is the leading indicator of AI fluency. The owner is no longer just consuming the AI's output, they're driving it. Five questions per week is the sticky threshold.

**What could go wrong, and what we built in to mitigate it.**

The biggest risk is over-trust. The owner over-relies on a Profit Coach recommendation, makes a high-stakes decision based on a wrong call, takes a real loss. Mitigation: dollar impacts are reported as ranges, not point estimates. "Estimated +$280 to +$420 per month" reads as analysis. "+$340 per month" reads as fact. The range matters.

The second risk is data drift. The owner switches to Homebase but forgets to confirm the sync, labor data goes stale, recommendations get optimized for the wrong number. Mitigation: a weekly reconciliation alert that compares the latest sync timestamp to the calendar.

The third risk is hallucination on Ask Anything. The model invents a number that isn't in the data. Mitigation: every Ask Anything response returns the source view alongside the answer. The owner can click through to verify before acting.

Three real risks, three real mitigations, in the system from Day 1.

---

## 6. What I'd do differently as an outside vendor

I built this with permission, for a partner I already knew. As a forward-deployed engineer engaging this customer fresh, three things change.

**Scope discovery before scope build.** I'd run a one-week discovery before writing any code. Shadow a Monday morning. Shadow a month-end. Watch the owner cross-reference Bookeo and the spreadsheet. Time the friction directly. The four frictions in Section 2 are accurate because I had already seen them. A vendor working blind would invent the wrong solution if they skipped this step. The most common FDE failure mode is technical teams that build great solutions to problems the customer doesn't actually have.

**Package the architecture for replication.** Owner-operated SMBs in this category — escape rooms, axe-throwing venues, mini-golf, batting cages, board game cafes — share the same operational shape. Booking system plus time tracking plus spreadsheet. The Supabase schema, the edge function pattern (`bookeo-sync`, `homebase-sync`), and the AI context object all generalize. As a vendor I'd structure this as a templated layer with per-customer config, not bespoke work per shop. The first customer pays for the template. Customer two onwards pays for the per-customer config and the AI tuning. That's how this work scales beyond consulting.

**Instrument the AI layer for cross-customer learning.** Every Profit Coach recommendation that gets acted on or ignored is training data for tightening the next customer's prompt. Building that loop in from Day 1 is what separates "AI consultant" from "AI platform." Customer 1's click-through rate informs Customer 2's initial prompt. Customer 2's questions in Ask Anything reveal which views to surface for Customer 3. The leverage compounds with each new customer, but only if the instrumentation was there from the start.

That last one is the FDE-vendor mental model I want to bring to the next role. Sit with the customer, build what they need, and design the instrumentation so what you learn from this engagement makes the next one ship faster and better. That's the work I want to do for a living.

---

## Appendix (to add)

- **Architecture diagram** — Bookeo + manual CSV → Supabase → views → dashboard + AI context
- **Schema sketch** — key tables: `bookings`, `employees`, `time_entries`, `payroll_periods`, `fixed_expenses`, `revenue_targets`, materialized views
- **AI context object** — the JSON shape passed to Gemini for both Profit Coach and Ask Anything
- **Screenshots** — Overview, Year, Explore, Break-even, Bonus tracker, AI Insights card (logos blurred)
