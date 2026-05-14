## Why I started

I kept hearing about vibe-coded apps being the new thing. The pitch was: open Cursor, describe what you want, ship a working SaaS in an afternoon. I wanted to see whether that was actually true or whether the people saying it were selling a course.

So I picked a real product idea where I knew the unit economics wouldn't work, but the build was non-trivial enough to be an honest test of the toolchain. Paysplitt is a credit-card spending router with rule-based splits and a rewards-optimizer mode. Stripe Connect for the routing, a config-driven rules engine, and a small LLM call inside the auto-router. An end-to-end production app with real money flowing in test.

## What it actually took

Forty-five days of consecutive evenings.

You can get a "working dummy" in fifteen minutes. A few static pages, a fake login, a hardcoded output. What you can't get in fifteen minutes is anything that survives contact with reality. Stripe webhooks that retry properly. OAuth flows where the user doesn't get stuck. An auto-router that doesn't pick the same card twice when two purchases hit in the same millisecond. Error states for the dozen ways a card capture can fail at 11pm on a Friday. The boring eighty percent of work that separates "I demoed it" from "a real user could use it."

That eighty percent is what the influencer take leaves out. The model is genuinely better at writing code than it was a year ago. The model is not yet good at noticing the unhappy paths you didn't think to ask about. That distinction is the real bottleneck, and you only feel it once you ship something that has to keep running.

## What forty-five days actually taught me

Picking the model for the task. When Sonnet's depth is worth the extra cost over Haiku. When Opus is overkill. When a small fast model is plenty for a deterministic step. When the right architecture is two models in a chain instead of one model trying to do everything. That decision used to feel arbitrary; after enough builds it stops being arbitrary.

Watching for the kind of hallucination that's hard to catch. It's not "the model invented a totally fake answer." It's function names that don't exist in any library, API signatures from an older version of the same library, configuration flags that read plausibly but aren't quite right. The model is most confident when it's wrong about something this specific, and that's the pattern you have to internalize.

Working inside real context windows and token limits. Keeping the model focused on the right slice of the codebase. Knowing when continuing the same conversation pays off and when starting a fresh one will produce a better answer. These constraints are real and they show up in every build past a certain size.

Knowing where the human layer has to stay. Designing the user experience for an error state. Naming things so the next person can find them. Picking between two approaches that both technically work. The model is a good engineer and a bad product manager, and the second half is where the build gets bottlenecked.

Learning the operational tooling around the model. GitHub workflows, Vercel and Railway for deploys, Sentry for catching what slipped through, Cloudflare for the network layer, OAuth flows for every external integration. None of these I had touched before this build. All of them I now know enough about to either work with directly or to have an agent work with on my behalf next time.

## What this build unlocked for the rest of the portfolio

This is the most important part of why paysplitt is on this site.

The two CAC builds (the data dictionary and the SAS coding agent) each took a couple days to build and a couple more days to roll out. That speed was only possible because Paysplitt had absorbed the slow learning for me. I knew which model to reach for, what shape the prompt needed to take, where the unhappy paths would land, which tools I'd need around the model. The data dictionary's usage guide was itself written by Copilot once I tested the workflow. Same with the SAS agent: build it for myself, document the prompt scaffold, share it with coworkers, watch them adopt it.

The compounding effect is the punchline. Forty-five days of slow learning on Paysplitt translates into days, not weeks, on every subsequent build. Now that I know what the build actually takes, I can also start programming agents to do the parts that were slow the first time. That's the trajectory: do it once the hard way, then the same work becomes cheap.

## The takeaway I'd bring to an applied-AI role

The influencer pitch about vibe-coded apps is half right. AI tooling is genuinely collapsing the coding part of building software. What's underrated is how much human judgement the rest of the build still takes: prompting precisely, knowing where mistakes will land, knowing when to trust the model and when not to. You cannot fully rely on AI. You have to know the toolchain well enough to verify it.

A team that hires me gets someone who has spent forty-five days alone with the toolchain on a real product, then spent the months after that turning the lessons into builds that ship in days. The slow build is what makes the fast builds possible.

## Stack

Next.js for the app, Stripe Connect for card capture and transaction routing, Supabase for user state and rule storage, a small Claude call for the auto-router scoring. Cursor and Claude for roughly 95% of the engineering itself.

Live at [paysplitt.com](https://paysplitt.com).
