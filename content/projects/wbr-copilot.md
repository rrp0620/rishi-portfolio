## The problem

The weekly business review is what the executive team reads on Monday morning to operate the business that week. Revenue, the strategic-initiative tracker, anomalies worth flagging, the narrative that ties the numbers to a decision. Half a day every Monday used to disappear into producing it. Pull the data, eyeball the anomalies, draft the narrative, drop it into the slide shape the exec team is used to reading.

The work was important enough that I didn't want to compress it. It was also predictable enough that most of it was plumbing.

## What I built

A Claude Code script that does the plumbing. It pulls the underlying datasets, runs the anomaly checks against the prior period, drafts the narrative section by section, and renders into the slide structure the executive team already reads from. I keep a hard human-review step on every section before anything ships. The script doesn't decide what's important; it produces a defensible first pass so I can spend the recovered hours on what the numbers actually mean.

Prep time went from roughly half a day to roughly 30 minutes. The 30 minutes is the part that mattered: reading the draft, catching anything that doesn't pass the smell test, sharpening the narrative.

## What stays human

The decisions stay human. The script writes anomaly callouts; I decide which ones rise to the exec team. The script drafts the narrative; I rewrite the section that frames a recommendation. The script populates the strategic-initiative tracker; I'm the one who answers when the CBO asks why an initiative slipped.

That handoff is what keeps the review trustworthy. An LLM that drafts a weekly exec narrative without a human in the loop is one bad week away from a confidently wrong page in front of the people who run the company.

## What this taught me about deploying AI in an executive context

The exec team didn't want an AI assistant. They wanted the WBR on Monday morning. The AI tooling is invisible to them, which is the right answer for the surface. The work the AI moves is upstream of where they read.

The same shape carries across most of the other projects on this site. The user shouldn't have to navigate to the AI. The AI should land where the user already opens their week.
