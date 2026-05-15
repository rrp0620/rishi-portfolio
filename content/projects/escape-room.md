## TL;DR

A friend of mine runs a single location escape room business. After three years and about 5,000 paid bookings they were still losing money every month, and the owner couldn't tell exactly where the loss was coming from. Their operational data lived in three places that didn't talk to each other: Bookeo for sales, a time sheet CSV for labor, and a spreadsheet for fixed expenses that was usually weeks behind reality.

What I built them is a small AI operating layer. The bottom of it is a Supabase warehouse that pulls everything into one shape every night. On top of that warehouse sit two model driven surfaces: a Profit Coach that watches the consolidated data and flags weak time slots with a dollar impact range, and an "Ask Anything" box where the owner can ask questions of the business in plain English and get the answer back with the SQL attached. The rest of this writeup walks through the friction the system was meant to close, what the architecture underneath it looks like, and what would change if I were doing this for a paying customer instead of for a friend.

## The business

This is one owner operator and three part time employees running a single physical location. They've been open about three years, done somewhere around 5,000 paid bookings, and brought in lifetime revenue in the mid six figures. The lead host earns a small revenue bonus on top of the hourly rate.

The owner's week, before any of this work, looked roughly like this. Monday morning they'd open Bookeo and try to figure out how the previous week had done, compared against a benchmark they were keeping in their head. Sometime mid week they'd decide whether to run a promo or push social, mostly on feel. At the end of every pay period they'd pivot a time sheet CSV into something usable, multiply by hourly rates, total it for the month, and hope the math was right. At month end they'd reconcile fixed expenses against revenue, mentally guess whether the month had been profitable, and find out two or three weeks later that it hadn't been.

This is a margin sensitive business that had been running a small persistent monthly loss. Not catastrophic, but persistent enough that the only operating question worth answering was "how do we stop losing money?" Every other decision was downstream of one underlying gap: **the owner couldn't see profitability in real time, so by the time they reacted to a bad week, the bad month was already booked.**

That's the workflow this writeup is about.

## Where it bleeds

There were four friction points worth fixing, ranked here by the operating cost they imposed.

### No real time visibility into profitability

Revenue was in Bookeo. Fixed expenses were in a spreadsheet. Labor was in a time sheet CSV that got imported by hand every couple weeks. Answering "are we profitable this month?" meant consolidating three sources manually, so the owner answered it monthly at best and often a month late. By the time they realized they were underwater, the month had closed.

### Manual labor cost reconciliation

The time sheet CSV was the bottleneck inside the bottleneck. Every pay period the owner pivoted it from wide format (employees as rows, pay periods 4 through 44 as columns) into something usable, multiplied by hourly rates, and totaled it for the month. Twenty minutes of work every two weeks, error prone, and never current. Labor numbers were always one to fourteen days stale.

### No way to answer ad hoc business questions

*"What's our Saturday average ticket?"* *"Which room has the worst average party size?"* *"What's our break even revenue per day in April?"* These are the questions an owner needs to answer to find profit levers. The data sat in Bookeo and the spreadsheet, but the owner doesn't write SQL and isn't going to learn.

### No anomaly detection

A bad week looks like a normal week unless you can compare it to the same week last year or against a target. Without targets, every week was "fine." A 25% drop on Saturday afternoons would get noticed only when the month closed, or sometimes not at all.

The unifying problem was not any single one of these. It was that the owner was trying to run a margin sensitive business **without a feedback loop that closed faster than a month.** That's the gap the system was built to close.

## The BI foundation: why I built the dashboard before the AI

The owner had asked for AI tooling. They wanted a Profit Coach. What I built first was the boring part: a consolidated database, with a handful of dashboard pages reading off of it.

The reasoning is uncomplicated. A model is only useful when it can read the picture in one shot. If Profit Coach has to stop and ask "what was last Friday's revenue?" before making a recommendation, the latency kills the interaction and the answer is wrong half the time anyway. Putting a model on top of disconnected data produces confident output and unreliable conclusions. So the first job was getting the data into one place.

### The data layer

A `bookeo-sync` edge function pulls bookings into a Supabase database every morning via `pg_cron`. A `homebase-sync` function handles labor data once the owner switches off the manual CSV import. Fixed expenses live in a `fixed_expenses` table, editable inline from the Break even page so the owner can update them without ever touching a spreadsheet again.

Above the raw tables there are a handful of materialized views: `mv_daily_revenue` for the per day rollup, `mv_monthly_summary` for the month level numbers, and a couple of cohort views for by room and by time slot cuts. The views matter for two reasons. The dashboard renders fast because it's reading pre aggregated data instead of scanning bookings. And the AI context object becomes cheap to assemble, because the Profit Coach reads from the same views the dashboard does. That means what the model sees and what the owner sees are exactly the same numbers, which removes a class of "the AI said X but the dashboard says Y" failure modes.

### The dashboard pages

The dashboard has six pages, in priority order. Overview is the Monday morning page and shows last week's revenue, the run rate to monthly target, the top line P&L, and the AI Insights card. Revenue is the drill down page where the owner can break sales down by day, by room, or by time slot. Year is a twelve month rollup with editable monthly revenue targets that the owner sets at the start of the year. Explore is a real BI tool where the owner picks a metric, groups by something, filters by something else, and either shares a URL or exports a CSV; it exists specifically to replace "can you pull this for me" messages. Break even shows fixed expenses on the left and the revenue required to cover them on the right, editable in place. Bonus tracker automates the lead host's revenue bonus calculation against the current month's run rate.

Each page took roughly half a day to build once the data was in place. Most of week 1 went to the architecture. By the end of that week, the owner had real time visibility for the first time since opening. The AI features came on top of all this, the next week.

The thesis underneath this section is that the BI work is what makes the AI work credible. Without the warehouse, the model is guessing. With the warehouse, the model is reading the same numbers the operator is.

## The AI layer

Once the data is consolidated, the AI layer becomes a thin shell. Both surfaces (Profit Coach and Ask Anything) read from the same context object, which is a JSON blob assembled from the materialized views. The context includes hour of day patterns, day of week patterns by season, fixed expenses, cancellation rate, monthly target, current month run rate, and room mix. Same context, two interfaces.

### Profit Coach

Profit Coach runs in structured output mode. The model receives the context object and returns 3 to 5 ranked recommendations, each carrying an estimated monthly dollar impact range. Output is constrained to actionable levers and not vague suggestions. Sample outputs from the live system:

- "Close at 9pm Monday through Wednesday. Estimated -$340 labor, -$120 revenue, net +$220/mo."
- "Shift Room A pricing from $32 to $36. Estimated +$280 to +$420/mo based on price elasticity inferred from current bookings at the $30 promo rate."
- "Cancel [software vendor] subscription. Estimated +$110/mo, no operational impact based on the past 90 days of usage."

These show up as a card on the Overview page. The owner sees them every Monday morning. Each one has a "details" expander with the underlying numbers behind the recommendation.

### Ask Anything

Ask Anything is free text Q&A over the same context. The owner types a question in plain English. The model returns a grounded answer with the source view linked alongside, so the owner can verify before acting.

Real examples that have come up in usage:

- "What's our break even revenue per day in April?"
- "Which room has the worst average party size?"
- "What's our Saturday afternoon trend over the last six months?"

These would have been "can you pull this for me" Slack messages going to me at 9pm on a Tuesday. Now they're 5-second answers in the owner's own browser, with the SQL attached if the owner wants to verify.

### How each friction maps to the AI layer

The four frictions from earlier split cleanly across the two surfaces. Real-time profit visibility is solved primarily by the BI dashboard, with Profit Coach as the prescription layer interpreting what the dashboard surfaces. Manual labor reconciliation is solved by the BI layer alone; the AI isn't involved at all. Ad-hoc business questions are solved by Ask Anything. Anomaly detection is solved by Profit Coach, which surfaces "this slot is underperforming" the moment a run rate diverges from target.

Three of the four frictions get touched by the AI. One doesn't need it. That's the correct ratio for a build like this. Not every operating problem is an AI problem, and pretending otherwise is how AI rollouts lose credibility.

> BI before AI. The model only works because the data underneath it was consolidated and clean to start with. Without that step, every recommendation would have been confidently wrong about half the time.

### Two intentional non goals

The AI never auto executes anything. No automatic price changes, no automatic schedule edits, no draft emails sent without a click. The owner stays in the loop on every decision the system surfaces.

The AI also doesn't get its own tab. There is no "AI assistant" page to navigate to. The model surfaces where the owner is already looking, which is the Insights card on the Overview page. The point of an AI feature is to be inside a workflow the user already has, not a workflow the user has to enter.

## Rollout plan for a non technical owner

Adoption matters more than features. A great dashboard nobody opens is worse than an okay dashboard the owner uses every day. The rollout was designed for one non technical user who has very little time. There are three phases.

### Days 0-30: BI foundation only, no AI

The goal in the first month is muscle memory. The owner gets trained on three pages: Overview (the Monday morning page), Year (where they set monthly revenue targets), and Break even (where they keep fixed expenses up to date). The Explore page is intentionally left out at this stage. It's the most flexible page in the system but also the most overwhelming, and overwhelming a non technical user kills adoption fast.

Adoption metrics for this phase are login frequency and Break even page edits. The owner should be opening Overview every Monday and editing Break even at least once a month. If those two things are happening consistently by the end of month one, the BI layer is sticking and the AI work can go on top.

### Days 30-60: Profit Coach in preview

Profit Coach goes live on the Overview page, flagged with the label "AI suggestion: read before acting." Each recommendation expands to show the underlying numbers and the assumptions behind the dollar impact range. The owner can dismiss recommendations they disagree with. I track which ones get clicked into and which get ignored.

That click data tunes the next prompt revision. Recommendations that get ignored every week are usually wrong shaped, meaning the threshold or the scale or the tone is off. Recommendations that get clicked but not acted on are usually right shaped but wrong sized. Both signals shape the prompt I rewrite the next month.

The adoption metric here is click through rate on AI recommendations. If the owner is clicking zero of them by week four, something is wrong with the recommendations, not with the owner.

### Days 60-90: Ship Ask Anything, tighten Profit Coach, open Explore

Ask Anything ships in month three. Profit Coach gets its prompt tightened based on the click through patterns from the previous month. Explore comes online now that the owner has confidence with the rest of the system.

The adoption metric for this phase is questions asked per week in Ask Anything. Five questions a week is the threshold where the AI feels sticky to the owner. That's the leading indicator of AI fluency. The owner is no longer consuming the AI's output; they're driving it.

### How the owner changes things without breaking them

A Profit Coach prompt isn't a one time thing. As the business changes (a new room opens, a price point shifts, a competitor moves in down the street), the prompt has to change too. The owner doesn't write code and was never going to edit a system prompt in production directly. If the only way to tune the AI is to ask me, the AI ossifies to whatever I shipped on day one.

So part of the rollout was building them a small prompt generator script. The owner edits a plain language config file ("weight Saturday afternoons higher," "cap Room A pricing recommendations at $36," "ignore the seasonal whiskey spike when ranking holiday slots") and the script regenerates the production prompt against that config. Before the new prompt is allowed to save, the script runs it as a dry pass over the last six weeks of recommendations and checks whether the output diverges from what the current prompt produced by more than a tolerance threshold. If the output diverges too much, the script refuses to save and surfaces a side by side of what changed.

The end state is that the owner can change how Profit Coach behaves without ever touching production code and without risking a silent break. Same pattern shows up in two other projects of mine: there's a small library of these scripts I reuse across builds, because the safe handoff problem is the same shape every time.

Most of the AI work I want to do in the next role is this part, not just the build.

### What could go wrong, and what's mitigated

The biggest risk is overtrust. The owner relies on a Profit Coach recommendation, makes a high stakes call based on a wrong one, and takes a real loss. The mitigation is that dollar impacts are reported as ranges and not point estimates. "+$280 to +$420/mo" reads as analysis. "+$340/mo" reads as fact. The range is what keeps the recommendation properly calibrated in the owner's head.

The second risk is data drift. The owner switches to a new POS or HRIS but forgets to confirm the sync, labor data goes stale, and recommendations start getting optimized for the wrong number. The mitigation is a weekly reconciliation alert that compares the most recent sync timestamp against the calendar and pings the owner if anything looks behind.

The third risk is hallucination on Ask Anything. The model invents a number that isn't actually in the data. The mitigation is that every Ask Anything response returns the source view alongside the answer, so the owner can click through and verify before acting on whatever the model said.

All three of these are real failure modes worth planning for. The mitigations were built before the AI features were.

## What I'd do differently as an outside vendor

This was built with permission, for a partner I already had a personal relationship with. As an outside vendor engaging this customer cold, three things change about how the work would have to run.

### Scope discovery before scope build

I'd run a structured one week discovery before writing any code. That would mean shadowing a Monday morning, sitting through a month end close, watching the owner cross reference Bookeo against the spreadsheet, and timing the friction directly with a stopwatch. The four friction points above are accurate because I'd already seen them up close. A vendor working from a sales call brief would almost certainly invent the wrong solution. The most common failure mode I've watched in software for SMB is technical teams building polished solutions to problems the customer doesn't actually have. Discovery is the only way to avoid that, and most teams skip it because it doesn't bill obvious dollars.

### Package the architecture for replication

Owner-operated SMBs in this category (escape rooms, axe-throwing venues, mini-golf, batting cages, board game cafes) share the same operational shape. There's always a booking system, a time tracking system, and a spreadsheet for fixed expenses, and the owner is always the bottleneck for reconciling them. The Supabase schema I built, the edge function pattern (`bookeo-sync`, `homebase-sync`), and the AI context object generalize across all of these. As a vendor I'd structure the work as a templated layer with per customer config rather than bespoke work per shop. The first customer pays for the template build. Customer two onwards pays for the per customer config and the AI tuning. That's how this kind of work scales beyond consulting.

### Instrument the AI layer for cross customer learning

Every Profit Coach recommendation that gets acted on or ignored is training data for the next customer's prompt. Building that loop in from day one is what separates an AI consultant from an AI platform. Customer 1's click through rate informs Customer 2's initial prompt. Customer 2's questions in Ask Anything reveal which views to surface for Customer 3 before the third engagement even starts. The compounding only happens if the instrumentation was there before customer one. Bolting it on after the fact loses most of the value.

That last one is the mental model I'd want to bring to the next role. Sit with each customer and understand what they actually need first. Design the build so the next customer is better served because of what was learned with the one before. That's the kind of work I'd like to do for a living.
