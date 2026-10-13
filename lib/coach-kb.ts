/**
 * Knowledge the WebSage Call Coach, the post-call review and the call-prep generator answer from.
 * Source of truth for prices: websageinc.com/pricing.html and the "Offers and Pricing" doc in Drive.
 * Keep this in sync with both (last synced 2026-10-13, after the new website launch).
 */
export const COACH_KB = `
COMPANY: WebSage Inc., a small AI automation and web studio in Middletown, Delaware. Builder: Rishi. Client lead: Nicole. Phone (302) 344-2033. Email info@websageinc.com. Website websageinc.com (prices at websageinc.com/pricing.html, one page per service at websageinc.com/services/). Show, don't tell: we build a demo, spec site or mini audit before the call. Money math on everything, using the low end and labeled assumptions. Never promise results.

PRICES (list prices, from the website):
- AI support assistant (website chatbot): founding (first 3 clients) $500 setup + $199/mo, setup refunded if it doesn't pull its weight in 30 days. Standard $1,500 to $2,500 setup + $300 to $500/mo.
- AI automations: Simple $250 to $750 (one trigger, one action, up to 2 apps). Focused $750 to $2,500 (one full process). Connected from $2,500 (multiple apps, record matching, reports).
- Websites: own it outright $990 single page, $2,500 multi-page with booking, $5,000 custom. Or $500 setup + monthly: Essentials $99 (hosting, fixes, 2 edits a month, Google Business Profile setup), Growth $199 (most popular: unlimited edits + monthly lead report), Local Domination $299 (Growth + review engine + SEO push).
- Review engine: $500 setup + $99/mo (also included in Local Domination).
- AI visibility audit: $499 one-time; monitoring and fixes $250/mo; audit credited if monitoring starts within 30 days.
- AI receptionist / missed-call capture: custom quote (we have quoted $500 + $297/mo; confirm with Rishi).
- AI social posting: custom quote.
- Online ordering / DoorDash setup: custom quote on the site; on the call DoorDash Launch is $485, intro $199, Launch Plus with photos and launch promo $297.
- AI consulting for bigger teams: diagnostic from $1,500, then monthly from $2,000.
- Custom software: Rishi scopes and quotes.
- Bundles: built on the call, "bundle two or more and save". Never quote bundle prices or discounts below list; say "let me confirm with Rishi".

WHAT EACH SERVICE CAN AND CAN'T DO (answer capability questions from this; when it's not here, say you'll confirm with Rishi):

1) AI SUPPORT ASSISTANT (website chatbot)
How it works: we collect their info (website pages, menu/price list, policies, FAQs, any doc or Google Sheet they give us) -> the assistant answers only from that info -> if it doesn't know, or someone wants a person, it collects name + phone/email and emails/texts the owner the lead -> monthly report of what people asked.
CAN: answer 24/7 in seconds; quote prices/hours/policies exactly as given; link to their booking, ordering, payment or quote page; collect leads; answer in Spanish and other languages; match their tone; be updated any time they send changes (included in monthly).
DAILY SPECIALS / CHANGING INFO: it only knows what we give it. If they keep specials in a Google Sheet or doc they already update, we can connect it so the assistant reads the latest version (setup work, small one-time add-on). Otherwise they text/email us changes and we update it (included), or they skip daily specials. It cannot guess today's special.
CAN'T (without custom work): book directly into their calendar (it links to their booking page; direct booking with Square/Calendly/Jane/Mindbody etc. is a custom add-on Rishi scopes), take payments, look up a customer's order or account, answer phone calls (that's the AI receptionist), see their inventory in real time unless we connect a feed.
Customization: their colors, logo, greeting, which questions it answers, where leads go, what it should never say. It's labeled as their assistant and always offers a real person.
Owner's part: approve the answers, tell us where leads go, send changes.

2) AI AUTOMATIONS
How it works: a trigger (form filled, booking made, invoice overdue, new review) -> actions (send email, alert owner, add to sheet/CRM, follow up on day 2 and 5) using tools like Zapier/Make or custom code, connected to the apps they already use.
CAN: speed-to-lead replies, follow-up sequences, appointment reminders by email, invoice chasing, onboarding emails, weekly reports, moving data between apps (forms, Gmail/Outlook, Google Sheets, QuickBooks, Square, Jobber, HubSpot and most apps with an integration), AI-drafted replies the owner approves.
TEXTING: only to people who opted in (TCPA / A2P 10DLC). No cold or mass texting ever. Any texting offer must be checked with Rishi.
CAN'T: work with an app that has no integration or API without custom work; promise exact timing on apps we haven't checked. Depends on the owner's app logins/permissions.
Customization: fully custom to their process; we map it with them first. Simple = 1 trigger/1 action; Focused = one full process; Connected = multiple apps + reports.

3) WEBSITES
How it works: we build a spec site first from their real info, they approve changes, we connect their domain (they own it), host it, and maintain it on a monthly plan or hand it over (own it outright).
CAN: mobile-friendly site, quote/contact forms that email them, click-to-call, Google Maps, reviews from their Google page, photo galleries, booking links, menus, basic SEO, Google Business Profile setup (Essentials+), monthly edits per plan, lead report (Growth+).
CAN'T: invent reviews or photos (we use their real ones); guarantee Google ranking; run their ads (not included). E-commerce/online ordering is a separate quote.
Customization: anything design-wise; they keep the domain. Changes: 2 edits/mo on Essentials, unlimited on Growth/Local Domination.

4) REVIEW ENGINE
How it works: after each visit/job, every customer gets the same friendly request with a link to the business's Google review form (by email, or text only if that customer opted in), plus a QR code for the counter -> the owner is alerted whenever any review posts -> good reviews get a drafted thank-you reply to approve, rough ones reach the owner fast so they can reply the same day.
RULE: we ask EVERY customer the same way. We never send only happy customers to Google or steer unhappy ones away (review gating): it breaks Google's policy and the FTC's 2024 reviews rule and gets profiles flagged. Customers pick their own stars and words; nothing is pre-filled. Anyone can also send the owner a private note, but it never replaces the Google link.
CAN: connect to their POS/booking/CRM to know who visited (Square, Toast, Jobber, etc. if it exports or integrates), or run off a simple list/spreadsheet, send reminders, draft replies, monthly review report.
CAN'T: remove or hide bad reviews, buy or write reviews, guarantee a star rating or a number of reviews, text people who didn't opt in.

5) AI VISIBILITY AUDIT
How it works: we ask ChatGPT, Google AI Overviews/Gemini, Perplexity and others the questions their customers ask ("best dog daycare in Newark DE") -> record who gets recommended and why -> report with a fix list (website info, Google profile, listings, reviews, FAQ content). Monitoring ($250/mo) re-checks monthly and does the fixes.
CAN'T: guarantee AI will recommend them or a ranking; AI answers change constantly. We report what we see and fix what's in our control.

6) AI RECEPTIONIST / MISSED-CALL CAPTURE (custom quote)
How it works: when they miss a call, an AI voice answers (or the call forwards after X rings), answers common questions from their info, takes a message/lead and sends it to the owner right away.
CAN: answer after hours or overflow, take messages, collect job details, send the owner a summary.
CAN'T (without custom work): book into their calendar directly, transfer live to a specific person in every setup. Texting back missed callers is only allowed with consent; check with Rishi before offering anything that texts. Pricing confirmed by Rishi.

7) AI SOCIAL POSTING (custom quote)
How it works: for accounts that went quiet, we draft and schedule posts using their real photos and their info; owner approves; we post on a schedule.
CAN'T: invent photos of their work, guarantee followers or sales, reply to DMs as them unless agreed.

8) ONLINE ORDERING / DOORDASH / SHOPIFY (custom)
DoorDash Launch: we set up their DoorDash merchant account (they own it), load their menu from what they already have, pick the plan, add "Order on DoorDash" links to Google and their site. DoorDash signup is free; DoorDash takes 15%/25%/30% per delivery order by plan and 6% on pickup; new merchants get 7 to 30 days commission-free. We don't control DoorDash fees or payouts. No DoorDash monthly plan from us.
Shopify: store setup for Instagram/Facebook sellers plus an email list so they own their audience.

9) AI CONSULTING (bigger businesses): paid diagnostic of where they lose leads/time, then a monthly plan to implement (lead tracking, speed-to-lead, reviews, AI visibility).

10) CUSTOM SOFTWARE: dashboards, portals, internal tools. Rishi scopes everything; never promise a timeline or price.

GENERAL ANSWERS:
- "Will it work with my software/website?" Websites: yes, a snippet on almost any site (Wix, Squarespace, WordPress, Shopify, custom). Other apps: usually, if the app has an integration; Rishi checks before we promise.
- "Who owns it?" They own their domain, their data, their accounts (DoorDash, Google). We host and maintain what we build on monthly plans.
- "Contract?" Month to month after setup unless Rishi agrees otherwise.
- "How fast?" Usually live within a week of payment for the assistant and websites; automations depend on scope.
- "What if your AI company raises prices?" That's on us; their price stays the same.

VALUE MATH: front desk time costs $15-$20/hour; 10 hours/week of repeat questions is about $600-$800/month. One saved booking (party $350, wedding $6,500, a lease, a membership, a $500 repair) can pay for the year. Use the low end, label assumptions, never promise a number of bookings.

OBJECTIONS:
- "We have an FAQ page": most people don't read it, they call; this reads it for them and answers in one line.
- "What if it says something wrong": it only answers from your info; if it doesn't know it says so and passes them to you; we fix anything same day.
- "Too expensive": one booking it catches after hours pays for it; founding price + 30-day setup refund.
- "Just email me": sure, and lock a specific follow-up time.
- "Is this a scam": fair; try the link first, you owe nothing to play with it.
- "Not interested in AI": think of it as a front desk that never closes.
- "My nephew can do it": he might; we keep it updated and send a monthly report so it improves instead of going stale.
- "Talk to my partner": set 10 minutes with both this week.
- "Too busy right now": that's exactly when it helps most; send the link, call back at a set time.
- "Already have a chatbot": ask what it answers; most old widgets just collect emails; ours answers from their info.
- "Can you only ask my happy customers for reviews?": Google doesn't allow that and it gets profiles flagged; we ask everyone the same way and you hear about every review right away so you can reply.

CLOSE: "If you like it we can put it on your real website this week. Founding clients are $500 setup and $199 a month, with a monthly report, and if it doesn't pull its weight in 30 days we refund the setup." Always end with a yes, a no, or a specific follow-up date and time.

CLIENTS AND PROOF: we have no paying support-assistant clients yet. Never claim clients, case studies, results, or numbers of businesses served. If asked about other clients: "You'd be one of our first, which is exactly why we're offering founding pricing. We also run this on our own local businesses." Prospects we built demos for are NOT clients and are never mentioned to other businesses.

RULES: never invent facts, prices, results, client names or reviews. No cold or mass texting; text only people who agreed. Tell people the call is recorded. Demo links built on a real prospect are private to that prospect. Price exceptions go to Rishi. If unsure: "Great question, let me confirm with Rishi and get right back to you today." No em dashes in anything written for customers.
`;
