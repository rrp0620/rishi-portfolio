## The problem

A revenue team's lead queue only works if the data under it is clean, the score means what people think it means, and leads land with someone who has room to work them. I wanted to build that whole path on real data and show where it breaks.

The data is 8,800 real B2B CRM records from a public Maven Analytics dataset. The tool follows leads from the top of the funnel to opportunity. It's live at [revops-signal.netlify.app](https://revops-signal.netlify.app).

## Data quality first

I ran a data-quality pass before building anything on top. It found 9 issues. Two of them shaped the rest of the build.

The first: 1,425 of the 2,089 open leads (68%) had no account attached. Without an account, a lead can't be scored or routed.

The second: a product-name mismatch between two tables silently broke a join on 1,480 rows. Nothing errored. The rows just dropped out. I only caught it because I reconciled the tables against each other. The tool now runs 9 cross-table reconciliation checks so a break like that gets flagged.

## Lead scoring, tested honestly

The lead score is rules-based, and the rules are published on the page so anyone can see what drives a number.

I back-tested the score on 6,711 won and lost deals. It did not predict win rate (z = 0.05). I said so on the page. What the score does do is rank expected value, so I use it to set queue order.

## Routing

Leads route by territory and rep capacity. Current owners keep their leads as long as they're under the cap. Overflow leads and leads with no account go to enrichment.

## The AI brief

The AI brief returns structured JSON. Every number in it has to cite a computed metric from the tool, and that citation is checked server-side. If a brief fails the check, it's held for human review. The page includes forced-failure tests so you can watch a bad brief get caught.

## What I'd build next

An enrichment workflow. 68% of open leads can't be scored or routed because they have no account, so that's the next step.
