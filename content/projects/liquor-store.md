## The owner and the two builds

Same small liquor store, two distinct builds, both for the same owner over the past year.

The first build came out of an obvious daily friction: the owner was hand keying invoices from four distributors every week, about 30 minutes each. The second build came a few months later, once the invoice work was running on its own and the owner had room to look at the next problem: weekly inventory ordering was still effectively a guess, despite seven years of POS sales history sitting in the system.

Both projects share an architecture and a handoff pattern, which is the most useful thing about telling them together.

## Build 1: The invoice agent

The owner's invoices land as PDFs in the store's general mailbox, each distributor formatting their line items slightly differently. Before this build, the owner would open them one at a time, type the items into the POS, and hope the SKUs matched. About 30 minutes per invoice, four invoices a week, most of a Monday morning gone before any other work got done.

The agent watches the mailbox for messages from the four distributor domains, ignores everything else, pulls down the PDF when one lands, and asks Claude to extract the line items into a structured shape. A normalizer maps each distributor's SKU labels to the codes the store's POS uses internally, then the agent writes a CSV that drops into the POS importer without anyone having to touch it. The owner gets a Slack ping when each invoice is ready.

Four invoices a week. Roughly 30 minutes each before. About two minutes of review per invoice now. Roughly two hours back per week, or 100 hours a year. The week the first distributor template went live, the owner started asking how soon I could add the next two.

The agent worked because it lived inside the workflow the owner was already running. No dashboard, no separate app. The owner sees a Slack ping, opens the folder, uploads the CSV in the POS, and moves on with the day.

## Build 2: The inventory reasoning layer

A few months later, with the invoice work running on its own, the owner had a different problem worth solving. Seven years of sales history sat in the POS with no usable way to turn any of it into better ordering decisions. Each week they walked the shelves, eyeballed levels, called distributors, and hoped they hadn't overbought whiskey in late November or underbought rosé before Memorial Day. The weekly call was good enough on average, but the variance was what made the bad weeks expensive.

The build is a reasoning layer that sits on top of the POS. Every Monday it pulls the previous week's sales and compares them against the same window last year, the four week rolling trend, and the rolling yearly average for that SKU. It cross references the result against current shelf stock and against a holidays and events table the owner maintains for things like the next sports schedule, school event, or municipal holiday that will spike traffic. The output is a short ranked list of SKUs worth ordering this week, each one carrying a one sentence rationale ("rosé volume was up 38% this same week last year, current stock covers nine days at that pace").

The owner skims the list, dismisses what doesn't fit, and one clicks the rest into a draft purchase order. The model is not making the buying decision. It's reading the data and writing the brief.

Two guardrails matter here. The agent never auto orders anything. And every suggestion can be expanded to show the chart that produced it, so the owner can sanity check the model's read of the data before committing money to it.

## What's running underneath both builds

The invoice agent runs on a Gmail OAuth integration scoped to a single inbox, a filter on the four distributor domains so everything else stays untouched, a small extraction prompt with one fully worked example per distributor (Claude does the structured parsing), a normalization step that maps distributor side SKU labels to the codes the store's POS uses, and one Supabase row per processed invoice holding the original PDF, the extracted JSON, and a flag for whether the parse passed validation.

The inventory layer runs on the POS API for nightly sales pulls, a Supabase warehouse holding seven years of normalized line item data plus the holidays and events calendar the owner edits weekly, a reasoning step that hands current stock and historical context to Claude with structured output requirements, and a draft order writer that translates approved suggestions into the format the POS importer accepts. The order writer is intentionally the same shape as the invoice agent's CSV output, which let me reuse most of the validation code.

## How the two share a handoff pattern

This is the part that matters most for what comes next.

The owner of this store doesn't write code and was never going to debug a Claude prompt or fix a Gmail webhook. So a real part of both engagements was teaching them how each tool actually does what it does, and giving them a way to change either one safely.

I wrote prompt generator scripts for both. For the invoice agent, the owner runs the script with a single example invoice when they want to onboard a new distributor; the script drafts the extraction prompt and SKU mapping skeleton, runs them against the example, and only saves if validation passes. From the owner's side, adding a fifth distributor is a one command operation that can't break the four already running.

For the inventory layer, the owner edits a plain language config file ("weight Saturday afternoons higher," "cap whiskey reorders at $X per month," "ignore last winter's rosé spike, there was a writeup in the local paper") and the script regenerates the production prompt against that config. Before saving, it runs a dry pass over the last four weeks of recommendations and checks whether the new ranking diverges past a tolerance threshold. If it does, the script refuses to save and surfaces a side by side of what changed.

The pattern is the same on both builds. I keep these prompt generator scripts in a small reusable library I bring to every small business AI engagement, because the safe handoff problem is the same shape every time.

## What this teaches about AI rollouts

The owner of this store is exactly the customer most AI vendor sales motions get wrong. Fewer than ten employees, no data team, no time to be the data team. If a product needs them to "configure it properly" before it produces value, the product has already lost them. Both tools shipped because every interaction with them took less time than the manual version they replaced.

That's the only test that matters for software inside a small business, and it's the same test that matters for internal AI rollouts at much larger companies. Measure adoption by time saved per interaction, not by feature count.
