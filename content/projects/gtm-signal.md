## The problem

A revenue team's lead queue only works if the data under it is clean, the score means what people think it means, and leads land with someone who has room to work them, so I wanted to build that whole path on real data and show where it breaks. The data is 8,800 real B2B CRM records from a public Maven Analytics dataset, and the tool follows leads from the top of the funnel to opportunity. It's live at [revops-signal.netlify.app](https://revops-signal.netlify.app).

## Data quality first

I ran a data-quality pass before building anything on top, which found 9 issues, and two of them shaped the rest of the build.

The first was that 1,425 of the 2,089 open leads (68%) had no account attached, and without an account a lead can't be scored or routed.

The second was a product-name mismatch between two tables that silently broke a join on 1,480 rows (nothing errored, and the rows just dropped out of the results). I only caught it because I reconciled the tables against each other, so the tool now runs 9 cross-table reconciliation checks that flag a break like that when it happens.

## Lead scoring, tested honestly

The lead score is rules-based, and the rules are published on the page so anyone can see what drives a number. I back-tested the score on 6,711 won and lost deals and it did not predict win rate (z = 0.05), which I said on the page. What the score does do is rank expected value, so I use it to set queue order.

## Routing

Leads route by territory and rep capacity, which means current owners keep their leads as long as they're under the cap, while overflow leads and leads with no account go to enrichment.

## The AI brief

The AI brief returns structured JSON, and every number in it has to cite a computed metric from the tool (that citation is checked server-side). If a brief fails the check it's held for human review, and the page includes forced-failure tests so you can watch a bad brief get caught.

## What I'd build next

The next step is an enrichment workflow, since 68% of open leads can't be scored or routed because they have no account attached.
