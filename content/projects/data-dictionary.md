## The problem

My day job is GTM analytics at a public company that's been running on SAS for over a decade. The analytics org has grown to hundreds of tables, and the same field will commonly appear under three or four different abbreviations depending on which team originally built the table. The canonical customer identifier might be `customer_id` in one schema, `cust_id` in another, and a shorthand variant in a third. People who'd worked the same workstream for years could keep that mapping in their heads.

After a recent reorganization moved a lot of folks across workstreams, nobody could. Getting up to speed on a metric you didn't own a month ago turned into a multi day exercise of pinging the previous owner to ask which tables actually carry the field, what it represents, and how it's calculated downstream. Most of that institutional knowledge wasn't in a doc anywhere. It was in old emails, Confluence pages from years ago, Teams threads, and a few people's heads.

## What I built

A Copilot driven agent that consolidates field level metadata across everything the enterprise Copilot already has access to. The agent walks the SAS schema first, then cross references against Confluence, email archives, Teams chats, and shared documents to build one record per field. Each record carries the tables the field lives in, the aliases it goes by, a paragraph describing what the field actually represents, and (when documented anywhere) the calculation logic behind it.

The interface is intentionally an Excel sheet, not a web app. Analysts type a field name into a search cell and the surrounding columns populate with the consolidated record. Excel because that's already where the team lives.

## Why this matters

It's the most useful thing I've shipped at work this year. After the reorg, new owners of a metric can get up to speed in an afternoon instead of a week. People moving into the team from outside can find the right column without having to ask three previous owners who used to know.

It's also a clean example of what AI is genuinely good at: reading messy unstructured context across years of email, threads, and old wiki pages, and surfacing it in the place the user already works. The model isn't replacing analyst judgement here, it's giving analysts a faster path to the context they need to apply judgement.

## What's running underneath

Microsoft 365 Copilot for the cross system corpus access (Confluence, email, Teams, SharePoint, all under existing enterprise permissions). A prompt scaffold that walks per field in five passes: gather candidate tables, gather aliases, gather descriptions, gather calculations, then merge and dedupe. Excel as the lookup surface, with a small index powering the field name search.

## What carries over to a customer facing role

This is the same pattern as the smaller engagements on this site, scaled up to a much bigger corpus. Get the data into one consolidated shape (here, one record per field), then put a thin AI layer on top that the user can interact with where they already work. Different stakeholders, different scale, same architectural thesis: clean context first, then a thin AI surface.

This is also the kind of build I'd want to be doing for a customer in an AI deployment role: identify a real friction (onboarding into existing knowledge is slow), use AI for the part it's good at (consolidating unstructured context), and ship the result inside a surface the user was already going to open.
