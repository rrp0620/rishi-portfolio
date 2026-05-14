## The problem

Most of my day-job reporting is in SAS. The workflows are predictable (write a SQL-shaped query against the warehouse, transform it, format the output, generate the report) but the boilerplate adds up. A new report could easily take an afternoon to write, debug, and validate, and across a team of analysts that's real time spent on plumbing instead of analysis.

## What I built

A Copilot-driven coding agent tuned to our SAS environment. I prompt-engineered it against the patterns we actually use: how our warehouse tables are named, where shared macros live, the formats we use for output, the conventions our team follows for documenting code. From a one-paragraph problem statement, the agent drafts a working SAS program. I review and iterate, but the heavy lifting on syntax and structure is done before I read it.

My own throughput on ad-hoc reports roughly doubled. What used to take an afternoon now takes a couple of hours, most of which is review and validation.

## What I did with it after it worked

The interesting part wasn't building the agent for myself. It was getting it to work for other analysts on the team without each of them having to figure out the prompts from scratch.

I wrote down the full prompt scaffold: the system prompt, the example tasks I'd walked through to tune it, and the iteration questions I'd asked Copilot when something wasn't producing the right shape of output. I shared that blueprint with the team and walked through it with each analyst so they could adapt it to their own reporting patterns. Different teams use different tables, different conventions, different output formats, so each version of the agent has to be tuned. Within a few weeks, multiple analysts were running their own version of the tool against their own workstreams.

The compound effect is the point. One analyst building a tool helps one analyst. Five analysts building tuned versions of the same pattern helps five teams. The real work was the documentation and the coaching, not the agent itself.

## Why this matters for an applied-AI role

This is the same shape as the customer-facing AI deployment work I want to do next. Build a working tool, write down the prompt scaffold and the iteration process, then teach other people how to make a version tuned to their context. That's how AI rolls out across an organization without one person becoming the bottleneck for every new use case.

It's also the second project on this site where the prompt-scaffold-as-handoff-artifact has been the multiplier. The escape-room and liquor-store builds each have a prompt-generator script the owner can run themselves. Here it's the analyst's own prompt blueprint they can edit. Same pattern, different surface, same compounding effect.
