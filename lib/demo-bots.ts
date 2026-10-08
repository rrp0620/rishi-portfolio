/**
 * Client demo bots for the Websage AI support-agent offer.
 *
 * Each entry is a business's public website content condensed into a
 * knowledge base. /demo/[slug] renders a chat trained on it, and
 * /api/demo answers from it (stuffed context, same pattern as Ask Rishi).
 *
 * Rule: only facts that appear on the business's own site. Never invent
 * prices, hours or policies. When the KB doesn't cover something, the bot
 * says so and offers to pass the question to the team.
 */

export type DemoBot = {
  slug: string;
  name: string;
  town: string;
  website: string;
  phone: string;
  /** Brand-ish accent for the chat header. */
  accent: string;
  greeting: string;
  starters: string[];
  /** Who a hand-off goes to, in plain words. */
  handoff: string;
  kb: string;
};

export const DEMO_BOTS: DemoBot[] = [
  {
    slug: "novus",
    name: "NOVUS Escape Room",
    town: "Middletown, DE",
    website: "https://middletown.novusescaperoom.com",
    phone: "(302) 696-2387",
    accent: "#7c3aed",
    greeting:
      "Hey! I'm the NOVUS assistant. Ask me about rooms, prices, parties, or booking.",
    starters: [
      "Which room is best for first-timers?",
      "How much for 6 people?",
      "Do you do birthday parties?",
      "Can my 8 year old play?",
    ],
    handoff: "the NOVUS team",
    kb: `
NOVUS Escape Room, Middletown, DE (Middletown Square). Phone (302) 696-2387. Email info.middletown@novusescaperoom.com. Party bookings: booking@novusescaperoom.com or info.middletown@novusescaperoom.com.
Book online: https://middletown.novusescaperoom.com/book/ (recommended, especially weekends).
Hours: Mon-Thu 12pm-8pm, Fri-Sat 10am-11pm, Sun 10am-7pm. Times outside these hours can be reserved by phone.
Format: 2-8 players per room, minimum 2 (no solo). Groups over 8 split into a second room. Each session is about 1 hour 15 minutes: 15 min briefing + 60 min of play.
Rooms (success rate, recommended players, physical activity):
- Project Fallout: 70% success, 5 players, crawling. Easiest, great for first-timers and families.
- Chamber of Hocus: 65% success, 6 players, crawling. Good for families.
- Dreadnought: 60% success, 8 players, minor crawling.
- Materia Medica: 40% success, 5 players, minor climbing and crawling.
- Testament of Tesla: 20% success, 6-8 players, heavy crawling. The hardest room.
Prices: ages 11+ and adults $30 per person, ages 7-10 $25, under 7 free. Payments non-refundable (can be exchanged for credit/products).
Promos: Post & Tag, 15% off for posting a story tagging @novusmiddletown (can't combine). Find the Rock, 50% off one player per rock found (can combine). Monthly deals posted on Facebook and Instagram.
FAQ: No age limit, but kids under 13 need adult supervision. Under 7 may not enjoy the music, parents decide. Rooms are not scary. Wear comfortable clothes, bring a spare pair of indoor shoes. Each room has a locker for bags. Some rooms have surprise elements and minor climbing/crawling; players can leave anytime. Group size can change without calling, you pay for actual players on arrival. Cancelling needs 24 hours notice. Arriving late can lead to cancellation.
Parties: Basic party room rental $50/hr (you bring everything, staff clean up). Full party package $450: escape room for 8, private party room for 2.5 hours (about 1 hour play then 1.5 hours in party room), 1 large pizza, 2 sodas, 8 ice creams, linens, tableware, setup and cleanup. Extra guests $25 each. Extra food ordered from Pat's Pizzeria, picked up by NOVUS and paid to the restaurant. Optional dedicated party host: $50 gratuity, scheduled in advance. Kids under 12 need a parent in the room. Everyone signs a waiver. Arrive 15 minutes early. To book a party, email info.middletown@novusescaperoom.com.
Corporate / team building: email info.middletown@novusescaperoom.com for pricing. Gift cards available.
`,
  },
  {
    slug: "ramseys-farm",
    name: "Ramsey's Farm",
    town: "Wilmington, DE",
    website: "https://www.ramseysfarm.com",
    phone: "(302) 496-6426",
    accent: "#c2410c",
    greeting:
      "Hi! I'm the Ramsey's Farm assistant. Ask me about the pumpkin patch, Bonfire Nights, parties, or field trips.",
    starters: [
      "How much is a birthday party?",
      "Do I need a ticket just to pick pumpkins?",
      "What happens if it rains on my party?",
      "When is Bonfire Night?",
    ],
    handoff: "the Ramsey's Farm events team (eventinfo@ramseysfarm.com)",
    kb: `
Ramsey's Farm, family owned since 1860. 440 Ramsey Road, Wilmington, DE 19803 (some GPS sends you to 500 Ramsey Rd, which is just further up the farm driveway, you're in the right place). Phone (302) 496-6426. Events email eventinfo@ramseysfarm.com. Weather updates posted on Facebook.
Fall hours: Pumpkin Patch and activities Fri 1-5pm, Sat-Sun 10am-5pm. Night events Fri-Sat 6-9pm, entry by 7:30pm.
All Activity Pass: Sept 19 to Nov 8, 2026, Fri 1-5, Sat-Sun 10-5, also open Columbus Day (Oct 12). Kids 3 and under free with each paying adult. Tickets are date-stamped. Weather closure = voucher valid until Dec 31 of next year. Rain-out tickets can be used any other open day that season. No other refunds. Activities: hay rides (weather/field dependent), barnyard animal feeding (chickens, cows, goats, sheep), 10+ acre corn maze (new design every year), Spookley Trail for young kids, pumpkin painting, combine slide playground, Cow Train. Individual activity tickets also sold at the farm. Tickets: ramseysfarm.ticketspice.com/pumpkin-patch
Pumpkin patch: no charge to pick, pumpkins are $0.80/lb. Small and specialty pumpkins sold individually in the tent. 10-12 acre patch, about 50,000 pumpkins.
Bonfire Night: Fri-Sat Oct 2 to Nov 14, 6-9pm (arrive by 7:30), plus Sunday Oct 11. Ages 4+ $15/person. Includes bonfire in the picnic grove, combine slide, flashlight corn maze, extended night hayride. S'mores kits sold on site. Halloween night is private events only. Limited door sales; buy online to guarantee entry.
Fall birthday party $350 (booked online): 10 kids + 10 parents, infants under 18 months free (no pumpkin). Extra child $20, extra parent $3. Slots Fri 1-3, Sat-Sun 11-1 and 2-4. 2 hours in a reserved tent or grove space with 4 seating tables, 1 serving table, 1 painting table. Includes private hayride, a pumpkin per child, pumpkin painting, all-activity wristbands (Cow Train extra). Max 40 per space. No exact headcount needed to book. Add-ons: tables $10, cornhole $25, campfire $70 (grove only), grill $20 (bring your own charcoal). Extra pumpkins $20 each incl. wristband. Smocks not provided. Can't arrive late or run past 2 hours.
Weekend private daytime $500: 20 guests, extra guests $18, Fri-Sun 2-4pm in the Picnic Grove, extend to 5pm for $120. Includes wristbands, private hayride, bonfire, tables, grill. Groups 60+ email first.
Private bonfire at Bonfire Night $400: 20 guests, extra $15, max 40 per bonfire, Fri-Sat 6-9pm from Oct 2. Includes flashlight maze, hayride, playground. Bring your own food and s'mores.
Weekday night (Mon-Thu 5:30-8:30) and weekday daytime (Mon-Thu 1-4): $15/person, $500 minimum; 100+ guests $13/person (weekday night). Add-ons: generator $35/hr, tents $300 (20x30) or $425 (30x40), fire pit $90, field-trip pumpkins $5.
School festivals / PTO events: from $13/person, 100-person minimum.
Field trips: from $12/child including a pumpkin. About 2 hours, 5 stations, aligned to DE and PA standards for Pre-K to 3rd grade. Mon-Fri 9am-2pm by appointment. Packed lunches allowed. Book weekday, school and field trips by emailing eventinfo@ramseysfarm.com.
Payment: weekend packages paid in full online (that's the deposit). Balances by Venmo @Ramseys_Farm (last name + event date in note) or at the Farm Market. Weekend cancellation free with 14+ days notice, inside 14 days deposit forfeited; reschedules carry over within the same year. Rain: Saturday events automatically get a Sunday rain date; Sunday events rescheduled by availability or refunded. Weekday deposits refundable up to 1 week before.
Policies: no confetti, balloons OK if secured. Farm water is not drinkable, bring drinks. Outside food allowed, pizza delivery OK but staff can't accept deliveries for you. Food trucks weekdays only with approval. Portable toilets and handwashing stations on site.
Jobs: apply online (JotForm) or printable application. Donation requests through the online form only, reply within 10 business days.
`,
  },
  {
    slug: "lang-development",
    name: "Lang Development Group",
    town: "Newark, DE",
    website: "https://langdevelopmentgroup.com",
    phone: "(302) 731-1340",
    accent: "#1d4ed8",
    greeting:
      "Hi! I'm Lang's leasing assistant. Ask me about apartments near UD, co-signers, pets, parking, or how to apply.",
    starters: [
      "Do I need a co-signer?",
      "Which apartments allow dogs?",
      "Can I sublease over the summer?",
      "When is rent due?",
    ],
    handoff: "the Lang leasing office (Leasing@LangDevGrp.com)",
    kb: `
Lang Development Group, 100 Dean Drive, Newark, DE 19711. Office Mon-Fri 9am-5pm. Phone (302) 731-1340. Fax 302-731-2881. Email Leasing@LangDevGrp.com. Off-campus housing near the University of Delaware, all complexes about a 5-15 minute walk to UD. Rent payments and maintenance requests through the SecureCafe resident portal.
FAQ: Application fee $40 per person. Co-signer required for full-time students; every person on the lease submits an application and a co-signer form. Leases are 12 months, June 1 to May 31. Security deposit is one month's rent. Utilities not included except trash and snow removal. Pets only allowed at The Mill at White Clay Creek and Main Street Courtyard: Pet Agreement, $250 deposit ($100 non-refundable), $25 per pet per month, cats and dogs under 30 lb only. Leased by the apartment, not by the bedroom; all tenants jointly liable. Subleasing is not allowed. Rent due on the 1st, 5-day grace period, then late fee of 5% of total rent. One combined check per apartment (no separate roommate checks). Tenant's insurance required on every lease; Lang can refer local agencies. How to apply: download the application and co-signer forms for every roommate, submit them to the office to reserve and schedule a lease signing.
Properties (bedroom options): The Lofts at the Mill, 31-37 Annabelle St (2,3). 108 E Main St (4,5,6). Christopher Court, 129 E Main (6). Mia Galleria, 257 E Main (3-6). Center Square, 10 Center St (2-4, virtual tours). The Mill at White Clay Creek, Woolen Way (1-4, pets OK). 132 E Delaware Ave (4,5). Pomeroy Station, 218 E Main (2-6). Lofts at Center Street, 43 Center St (4,5). Abby Court, 164 E Main (4). Chapel House, 52 N Chapel (4,5). North College Crossing, 60 N College Ave (3-5). Main Street Plaza, 123 E Main (3-6). Mill Townhomes, Woolen Way (5,6). Main Street Courtyard, 329 E Main (2-6, pets OK). Molly's Place, 287 E Main (2,3). The Horseshoe, 37-43 E Cleveland (3). 17 New Street (1,2). Madeline Crossing, 168 S Main (2-6). Millyard, 100 S Main (5,6). One South Main (3,4). Newark Bank Building, 102 E Main (4-6). 94 E Main (2-4). 532 Old Barksdale Rd (2-4, new 5-story building). Select properties have parking, balconies, fitness centers, study lounges. Rents are not listed online; ask the office.
Parking included at: 94 E Main, Millyard, Mill Townhouses, Mill at White Clay Creek, Barksdale, Mia Galleria, 132 E Delaware, 1 S Main, Center Street Lofts, Chapel House, North College Crossing, Main Street Courtyard, Madeline Crossing, Pomeroy Station, The Horseshoe, 17 New St, Molly's Place, Mill Lofts. Extra parking can be bought from Lang only at Mia Galleria. Outside permits: Kelway Plaza 314 E Main 302-731-0776; Lot 14C garage 77 Amstel Ave 302-831-1184; Newark Parking Authority 302-366-7154; New Ark UCC 300 E Main 302-737-4711; Shamrock Printing 261 E Main 302-368-8888.
Pre-leasing for the next school year is open now; call the office to check availability.
`,
  },
  {
    slug: "olympiad-gymnastics",
    name: "Olympiad Gymnastics",
    town: "Wilmington & Newark/Bear, DE",
    website: "https://olympiadgymnastics.com",
    phone: "302-636-0606",
    accent: "#db2777",
    greeting:
      "Hi! I'm the Olympiad assistant. Ask me about classes by age, pricing, parties, or makeups.",
    starters: [
      "My daughter is 3, which class?",
      "Do you have a free trial class?",
      "How much is a party for 15 kids?",
      "What if we miss a class?",
    ],
    handoff: "the Olympiad office (office@olympiadde.com)",
    kb: `
Olympiad Gymnastics / FLiP KiDZ, Delaware's longest-running gymnastics school (50+ years). Main gym: 380 Water Street, Wilmington, DE 19804. Second gym: 100 Peoples Plaza (Rt. 40 & Bus. 896), serving Newark, Bear and Middletown. Phone 302-636-0606. Email office@olympiadde.com. Register through the iClassPro parent portal. Makeups requested via the online makeup form.
Pricing basics: No registration fee. Tuition covers 4 classes a month (1x/week) or 8 (2x/week), due on the 20th of the month before. Sibling discount: 2nd student $10 off, 3rd+ $15 off (same household/account). No trial class, but if you're unhappy after the first class, the rest of the tuition is refunded if you email office@olympiadde.com within 3 days. You can start anytime if there's space; prorated if fewer than 4 classes left in the month.
Parent & tot: Born to Move Babies (3 months to pre-walking, Water St), 45 min, $15 pay-as-you-go. Born to Move Waddlers (walking to age 2, Peoples Plaza). Teeter Totz (24-42 months, both gyms, Thu and Sat), 45 min, $15.
Recreational, $125/month: Tiny Kidz (must be 3 by the first day of class), 50 min. Mini Kidz (age 4), 50 min. Super Kidz (5-6), 50 min. Power Kidz (1st grade and up), 60 min. Tweenz & Teenz (10+), 60 min.
Trampoline (Water St only): Super Jumperz ages 4-6, 60 min, $137.50 per 5-week session. Power Jumperz ages 7-10, 75 min, $150 per 5-week session.
Team development (by referral or evaluation), 90 min, $175/mo 1x/week or $288/mo 2x/week: Power Kidz II, Mighty Kidz (5-8), Competitive Development (7-14). Competitive teams train at Water St.
Closures: both gyms 8/31-9/7/26, 11/25-11/27/26 (Thanksgiving), 12/23/26-1/2/27, 3/29-4/2/27, 5/28-5/31/27. Water St only 11/13-11/15/26.
Policies: barefoot, hair back, no gum or jewelry. Girls wear a leotard (no tights) or t-shirt and shorts; leotard required for 90-min classes. Boys t-shirt and shorts. Kids must be toilet trained. Parents not on the gym floor. No food or drink in the gym. Missed classes get no credit, but makeups never expire (online form, account must be current). Missed camp days can't be made up. Stopping classes needs written notice before the stop date. Late pickup: free within 10 minutes, then $10 plus $1 per minute beyond 10. Payments non-refundable. Camps paid in full; camp refund needs written cancellation 7+ days before. Weather cancellations posted on Facebook and emailed, no credit.
Birthday parties: Water St gym, Saturdays only, 1:15 or 3:15. 60 minutes in the gym plus up to 45 minutes in the party room. $300 members / $315 non-members for up to 12 kids including the birthday child; extra kids $15 each up to 20 (16 is most comfortable). Ages 3-13, two instructors. Birthday child gets a free party shirt; guests get a free class coupon and a treat. No cake or refreshments provided (bring your own). $100 deposit to book, balance due at the party (cash or card, card on file). Cancellation fee $50. Final headcount due the Wednesday before. Every child needs a signed waiver. Arrive 10 minutes early. Book with the online "Request A Party" form.
Hiring: Olympiad is hiring greeters, coaches and marketing/sales staff (see the employment page).
`,
  },
  {
    slug: "thousand-acre-farm",
    name: "Thousand Acre Farm",
    town: "Middletown, DE",
    website: "https://thousandacrefarm.com",
    phone: "302-455-8880",
    accent: "#15803d",
    greeting:
      "Hi! I'm the Thousand Acre Farm assistant. Ask me about weddings, private events, or apple picking.",
    starters: [
      "How many guests does the barn hold?",
      "What's the deposit to hold a date?",
      "Can we bring our own caterer?",
      "Are you open for apple picking Sunday?",
    ],
    handoff: "the Thousand Acre Farm team",
    kb: `
Thousand Acre Farm, 260 S. Reedy Point Rd, Middletown, DE 19709. Phone 302-455-8880. Founded 2013 by Mike Hynson, now run by the second generation of the Hynson family. Book a tour (or a repeat visit) on the online calendar: calendly.com/thousandacrefarm. Full wedding pricing is in a brochure requested on the website.
Weddings: start at $6,500; reception-only packages start at $5,500. Flexible or off-peak dates cost less. $2,500 deposit to hold a date. All payments non-refundable. Main barn holds up to 200; 100-180 guests is the sweet spot approved by the fire marshal. Over 200 needs a tent. 200 Chiavari chairs. Sixteen 103"x30" Amish maple farm tables seating 8-10 each, plus extra tables and chairs. Weddings get exclusive use. Facility is tax-free. Tents and fireworks can be arranged.
Packages: Honey (12-hour exclusive venue-only rental; preferred bartending service and soft beverage package required; outside caterer allowed for a fee). Queen Bee (all-inclusive: catering, bar, coordinator, photographer, DJ, cake). Honey Bee (8-hour micro-wedding with catering, beverages, desserts, decor, coordinator). Sweetheart Ceremony (short waterfront ceremony). Day-before setup access $575/hr (Queen Bee and Honey only). Nothing left overnight.
Wedding FAQ: Honey weddings use partner caterers or bring an outside caterer for a fee. Rain plan: ceremony moves to the main dining floor by the fireplace, or rent a tent. A day-of coordinator from the preferred list is required. Event insurance with $1M liability including host liquor liability required, bought through The Eventhelper. Vendors arrive at contract start time (earlier costs a fee) and leave by contract end. DJs bring two XLR cables; parties can plug a phone into AUX; dance-floor lights installed; DJs bring a speaker for outdoor ceremonies. Early hair and makeup available for a fee (bridal party only). The Cider Barn can be added for the groom's party. Overnight parking allowed; if there's no event the next day a fee applies, arrange 2 weeks ahead. The Sunset Suite is available for the couple to stay overnight.
Private events (birthdays, rehearsal dinners, showers, formals, holiday and corporate events, concerts, celebrations of life): Main barn, 2 floors, 5 hours (1 setup + 3 event + 1 cleanup) from $2,900, includes waterfront patio and deck, dance lights and speakers, pool table, Pac-Man, TVs. Lodge Room, max 50 guests, $1,900. Add-ons: 3rd-floor loft $700, extra hour $475, ice cream bar $5/person, lawn games $150, Cider Barn downstairs $475, golf cart $400, fire pit $250, fireplace $250, both $400. Any caterer allowed for private events; kitchen fees may apply.
Apple orchard 2026: opened Sept 4, Thu-Sun 10am-4pm. U-pick apples $4 entry per person + $3/lb, 10 lb minimum. Book apple picking on Calendly. Cards only, no cash. Sunflowers $2/stem or 12 for $20 ($10 minimum). Pumpkins (from Oct 1) $10 each or 3 for $25. Sunflower photo sessions: first hour free with a Google review, extra hour or pro shoots $250, book by phone. Variety timing: Honeycrisp mid-September; Fuji, Pink Lady, Goldrush mid-to-late October. Field trips welcome.
`,
  },
  {
    slug: "doggie-playhouse",
    name: "The Doggie Playhouse",
    town: "Newark, DE",
    website: "https://thedoggieplayhouse.com",
    phone: "302-456-3647",
    accent: "#0891b2",
    greeting:
      "Woof, hi! I'm the Doggie Playhouse assistant. Ask me about daycare, boarding, prices, or what your pup needs to start.",
    starters: [
      "My puppy is 9 weeks, can he come?",
      "Boarding for 2 dogs, 3 nights?",
      "Can I pick up at 1pm?",
      "Does my dog need to be neutered?",
    ],
    handoff: "Joe and Danielle at the Playhouse",
    kb: `
The Doggie Playhouse, 18 Shea Way, Ste. 114, Newark, DE 19713. Owners Joe & Danielle Thompson. Phone 302-456-3647. Text line for vaccine records 833-479-2195. About 5,000 sq ft climate-controlled indoor space, XL crates for rest, medication given on request. Boarding 365 days a year; daycare closed on major holidays.
Hours (home page): Mon-Fri 6:30am-12pm and 2pm-7:30pm (closed noon-2 for nap time), Sat 7:30am-3pm, Sun 7:30-10:30am and 4:30-6:30pm. Note: the FAQ page lists slightly different visiting hours, so call to confirm before a visit.
Prices: Daycare half day (up to 5 hours) or Saturday $25. Full day $35. 10 visits $300 (includes a free bath). 20 visits $600 (includes a free bath). Boarding $55/night, 10% off a 2nd dog, 15% off a 3rd dog. Early check-in before noon $20. Late check-out after noon $35 weekdays, $25 weekends. Bath & brush from $35. Nail trim $10. Other baths and dog walking: ask. New clients: first daycare day free and 15% off the first boarding night. Newly adopted dogs get a free first day.
Policies: Daycare drop-off by 10am Mon-Fri. Boarding drop-off closes at 6pm weekdays, 2pm Saturday. No pickups or drop-offs noon-2pm weekdays. Reservations required. Packages prepaid, non-refundable, non-transferable, expire after 6 months; any package includes a free nail trim. Payment due at pickup: cash, Venmo, CashApp, Visa, MC, Discover; no checks from first-time clients. Bring your dog's own food pre-portioned in labeled zip bags (house food available for boarders). Bedding provided; you may bring 1 labeled toy, blanket or scent item.
Requirements: dogs must be 10 weeks or older. Dogs over 12 months must be spayed or neutered. Vaccination records from a licensed vet (owner-given shots not accepted). Negative fecal test and current flea preventative required. Must be non-aggressive with no food or toy guarding. Registration form and a private interview come first. Arrive and leave on leash; no pinch, correction or flea collars, and dogs don't wear collars inside. Owners sign a health contract (no illness or exposure in last 30 days); vet note needed to return after any illness.
How to start: fill out the registration form on the website, schedule the interview, then book with the Book Now form or by phone.
`,
  },
];

export function getDemoBot(slug: string): DemoBot | undefined {
  return DEMO_BOTS.find((b) => b.slug === slug);
}
