## The problem

A public-company multi-tier sales org with thousands of dealer accounts and a heavy revenue concentration in the long tail. The familiar shape: a small number of accounts drive a disproportionate share of the book, and when one starts to drift, nobody notices until the quarter closes. By that point the account managers have lost the window where intervention is cheap. Field leadership wanted earlier signal. The executive team wanted a portfolio-level read on health that wasn't built around the AM's gut.

The constraint underneath all of this is that the four roles looking at the same data want different cuts of it. An account manager needs today's queue of at-risk accounts. A district lead needs the district roll-up. A regional VP needs the region. The executive team needs one number, the company-wide health split, and the trend on it. The system has to land all four cuts off the same underlying scoring without turning into four products.

## Discovery first

I scoped the alert criteria with field leadership before writing any code. That meant sitting with district leads and regional VPs to walk through what an account that's about to fall out actually looks like, in their language. They didn't talk about model features. They talked about contract pattern shifts year over year, the way a dealer's product mix tightens before they go cold, the rhythm of submissions changing in a way that's not seasonal. Most of it lived in field-leader heads and a handful of one-off pivot tables.

The output of that week was a written spec of which behavioral signals counted, how they should be weighted, and where the line between "watching" and "at risk" should sit. A model trained against the wrong target is worse than no model at all because it makes the field stop trusting their own read. Discovery is the cheapest hour you'll spend on the whole build.

## What it watches

The scoring runs against two horizons. Year-over-year pattern shifts catch the slow drifts: a dealer who's quietly moved 40% of their volume to one product category over the last twelve months, a submission cadence that's halved without an obvious cause, a mix shift that doesn't match the comparable cohort. Trailing 12-month behavioral changes catch the faster ones: a sudden gap in submissions, a step-change in cancellation rate, a portfolio composition that's diverging from where it sat three months ago.

Both horizons feed the same status label per account: healthy, watching, at risk, or churned. The label is the contract every surface above it consumes. That contract is what keeps the same underlying scoring from sprouting into four parallel systems.

## How it lands in the field

The whole point of an early warning system is that it has to land where the user already is, not in a separate AI tab. So the alerts ship inside Power BI dashboards the field already opens. Four cuts of the same data, each role sees their slice:

- Account managers see today's at-risk and watching accounts in their book, with the underlying signal that triggered the flag attached so they can act on it without needing to call me.
- District leads see the district roll-up across their AMs: the health split for their district, today's new flags, and the trend on the watching-to-at-risk conversion.
- Regional VPs see the region. Same shape, more accounts, looser zoom.
- The executive team sees the company-wide health split and the trend on it. One page. The cut they actually use to operate.

The dashboard hierarchy mirrors the org. Each role is looking at the same underlying labels, just aggregated to the level they own.

## The handoff problem

This system is going to run for years and field leadership is going to want to change the alert criteria as the business changes. If the only way to retune the model is to ask me, the system ossifies to whatever I shipped on day one. So part of the build was a small config layer that lets field leadership change weights and thresholds without touching code. Edits flow through a dry-pass check against the last six weeks of alerts. If the new weights would have produced wildly different output, the system surfaces a side-by-side of what changed before allowing the save.

The pattern is the same one I used on the small-business builds elsewhere on this site. Different stakeholders, much bigger consequence if it breaks. Same shape underneath.

## Why this is the most relevant project on the site

For an AI deployment role, this is the closest thing I've shipped to the work the role would actually ask me to do. Exec-sponsored. Scoped with the field before scoping the model. Deployed across four levels of the org. Instrumented so the field can change the behavior without going through me. That's the shape of an AI Outcomes engagement at almost any vendor.

The piece that doesn't carry over is the data. The model here was trained on years of internal account behavior I don't get to use anywhere else. But the methodology — the discovery, the per-role surfacing, the safe-handoff layer — generalizes. It's the methodology I'd run at any customer.
