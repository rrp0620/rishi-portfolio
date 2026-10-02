export type Project = {
  slug: string;
  title: string;
  /** Short factual subtitle. One sentence, no italics, no rhythm tricks. */
  subtitle: string;
  /** Card body copy on the homepage. Three to five sentences. */
  summary: string;
  /** Stack chips. Keep to the tools that actually shipped. */
  stack: string[];
  /** Meta-ribbon label on the project page. e.g. "Case study", "Build notes". */
  label: string;
  /** Year shipped (or built, for experiments). */
  year: string;
  /** Approximate read time, shown in the meta ribbon. */
  readTime: string;
  /** Optional live URL — only set for projects with a public live surface. */
  liveUrl?: string;
  /**
   * Optional ordered list of 3-6 short step labels (2-5 words each).
   * Renders as a FlowSteps visualization above the project markdown.
   * The escape-room project uses a custom architecture diagram instead,
   * so it intentionally omits this field.
   */
  architectureSteps?: string[];
  /**
   * One-line audience tag rendered in the homepage card. Keeps the list
   * scannable: "For the executive team", "For an escape room owner", etc.
   */
  audience: string;
  /**
   * Optional headline metric for the homepage card. Renders as a single
   * line of plain text so the reader picks up the result before clicking.
   */
  outcome?: string;
};

export const GTM_SIGNAL: Project = {
  slug: "gtm-signal",
  title: "GTM Signal: a lead-to-opportunity funnel tool",
  subtitle:
    "Data quality, lead scoring, routing, and an AI brief built on 8,800 real B2B CRM records.",
  summary:
    "A funnel tool built on 8,800 B2B CRM records from a public Maven Analytics dataset. I ran a data-quality pass first and found 9 issues, including 1,425 of 2,089 open leads (68%) with no account. The lead score uses published rules and was back-tested on 6,711 won and lost deals. It didn't predict win rate, and the page says so. Routing assigns leads by territory and rep capacity, and an AI brief cites a computed metric for every number it states.",
  stack: [
    "React",
    "Vite",
    "Netlify Functions",
    "Claude API",
    "Structured outputs",
  ],
  label: "GTM systems build · live",
  year: "2026",
  readTime: "~4 min read",
  liveUrl: "https://revops-signal.netlify.app",
  audience: "For a revenue team working a lead queue",
  outcome: "9 data-quality issues found. 68% of open leads flagged for enrichment.",
  architectureSteps: [
    "Data-quality pass",
    "Cross-table reconciliation",
    "Rules-based lead scoring",
    "Territory and capacity routing",
    "AI brief with checked citations",
  ],
};

export const EARLY_WARNING: Project = {
  slug: "early-warning",
  title: "An early warning system for accounts at risk",
  subtitle:
    "Scoped with field leadership, deployed across a multi-tier sales org so account managers, district leads, regional VPs, and execs each see the slice of the field they own.",
  summary:
    "Built for the executive team I report to at a public company. The system watches contract pattern shifts year over year and trailing 12-month behavioral changes against a portfolio of dealer accounts, and flags accounts that look like they're about to fall out. I scoped the alert criteria with field leadership before writing any of it. Alerts surface inside Power BI dashboards tuned to each level of the org: account managers see today's at-risk accounts, district leads see the district roll-up, regional VPs see their region, execs see the company-wide health split.",
  stack: ["Power BI", "SAS", "Python", "Executive sponsorship"],
  label: "Day job · executive build",
  year: "2026",
  readTime: "~5 min read",
  audience: "For the executive team and the field sales org",
  outcome: "Active in production. Used at four levels of the sales org.",
  architectureSteps: [
    "Discovery with field leadership",
    "Behavioral feature engineering",
    "Pattern-shift scoring",
    "Power BI surfaces per role",
    "Owner workflows ship the alerts",
  ],
};

export const WBR_COPILOT: Project = {
  slug: "wbr-copilot",
  title: "Automating the executive weekly business review",
  subtitle:
    "A Claude Code script that turns the Monday-morning prep cycle into a 30-minute review and edit.",
  summary:
    "Half a day every Monday used to go to building the weekly business review the executive team reads to drive operating decisions. I wrote a Claude Code script that pulls the underlying data, generates the narrative, flags anomalies, and drops it into the slide shape the exec team is used to. I keep human review on every section before it ships, but the heavy lifting is done before I open the deck.",
  stack: ["Claude Code", "Python", "Power BI", "SAS"],
  label: "Day job · executive build",
  year: "2026",
  readTime: "~3 min read",
  audience: "For the executive team",
  outcome: "Prep cut from ~half a day to ~30 minutes per week.",
  architectureSteps: [
    "Pull underlying datasets",
    "Generate narrative + anomalies",
    "Draft slide shape",
    "Human review pass",
    "Ship to exec team",
  ],
};

export const DATA_DICTIONARY: Project = {
  slug: "data-dictionary",
  title: "A cross-team data dictionary",
  subtitle:
    "A Microsoft 365 Copilot agent that consolidates a decade of SAS metadata into a searchable Excel surface.",
  summary:
    "After a recent reorg, the same field at my day job often shows up under three or four different abbreviations across hundreds of SAS tables, and getting up to speed on a metric you didn't own a month ago turned into a multi-day exercise. I built a Copilot agent that gathers field-level metadata from emails, Confluence, Teams threads, and SAS itself, then surfaces it inside Excel where the team already works. New owners of a metric now get up to speed in an afternoon.",
  stack: ["Microsoft 365 Copilot", "SAS", "Confluence", "Excel"],
  label: "Day job · team enablement",
  year: "2026",
  readTime: "~3 min read",
  audience: "For the analytics org",
  outcome: "Onboarding to a new metric: a week → an afternoon.",
  architectureSteps: [
    "Copilot pulls enterprise context",
    "Cross-reference SAS metadata",
    "Resolve known aliases per field",
    "Build one record per field",
    "Excel lookup ships the dictionary",
  ],
};

export const SAS_AGENT: Project = {
  slug: "sas-agent",
  title: "A SAS coding agent for the analytics team",
  subtitle:
    "Built one for myself, then documented the prompt scaffold so the rest of the team could tune their own.",
  summary:
    "A Copilot-driven coding agent tuned to my team's SAS environment. From a one-paragraph problem statement it drafts a working program. After my own throughput roughly doubled, I wrote down the prompt scaffold and the iteration questions, then walked each analyst through adapting it to their own reporting patterns. Within a few weeks multiple analysts were running their own tuned versions against their own workstreams.",
  stack: ["Microsoft 365 Copilot", "SAS", "Prompt design"],
  label: "Day job · team enablement",
  year: "2026",
  readTime: "~3 min read",
  audience: "For the analytics team",
  outcome: "My report throughput ~2×. Replicated by multiple analysts.",
  architectureSteps: [
    "Analyst writes problem statement",
    "Copilot drafts SAS code",
    "Analyst reviews and iterates",
    "Production report ships",
    "Prompt blueprint shared with team",
  ],
};

export const ESCAPE_ROOM: Project = {
  slug: "escape-room",
  title: "BI + AI for a single-location escape room",
  subtitle:
    "A friend's business had been losing money every month for three years and couldn't tell exactly why. Built them the operating layer to figure it out.",
  summary:
    "About 5,000 paid bookings of real data, consolidated into a Supabase warehouse out of Bookeo, Homebase, and a fixed-expense spreadsheet that was always weeks behind. On top of the warehouse, two Gemini-powered surfaces: a Profit Coach that flags weak time slots with a dollar-impact range, and an Ask-Anything box that runs natural-language questions against the data. The methodology (discovery, BI foundation, thin AI layer, safe handoff scripts) is the same shape I'd run at any scale.",
  stack: [
    "Bookeo",
    "Homebase",
    "Supabase",
    "Gemini",
    "Edge Functions",
    "TypeScript",
  ],
  label: "Customer case study",
  year: "2026",
  readTime: "~8 min read",
  audience: "For an escape room owner-operator",
  outcome: "Monthly profit visibility closed from a month late to same day.",
  // architectureSteps intentionally omitted; this project uses the
  // EscapeRoomArchitecture diagram component instead.
};

export const LIQUOR_STORE: Project = {
  slug: "liquor-store",
  title: "Two AI tools for a liquor store",
  subtitle:
    "Distributor invoice parsing and weekly ordering grounded in seven years of POS history.",
  summary:
    "Two builds for the same owner over the past year. The first agent parses distributor invoice PDFs into POS-ready CSVs in the background, saving roughly two hours a week. The second is a reasoning layer on the same POS that ranks SKUs for the weekly order against seven years of sales history, current stock, and an owner-maintained holidays-and-events table. Both ship with a prompt generator script that lets the owner change how the AI behaves without touching production.",
  stack: ["Gmail API", "POS API", "Claude", "Supabase", "Next.js"],
  label: "Customer build",
  year: "2025-2026",
  readTime: "~6 min read",
  audience: "For a liquor-store owner",
  outcome: "~100 hours/year recovered on invoice work alone.",
  architectureSteps: [
    "Identify the manual workflow",
    "Wire up data + AI layer",
    "Ship inside owner's existing tools",
    "Hand off prompt generator script",
    "Owner runs and tunes it solo",
  ],
};

export const PAYSPLITT: Project = {
  slug: "paysplitt",
  title: "Paysplitt",
  subtitle:
    "First end-to-end AI-coded product. A credit-card spending router that splits purchases by rule or by rewards.",
  summary:
    "Authorize your cards, set rules (or use the auto-router), and Paysplitt picks the right card at the point of sale. Auto-router mode uses a small LLM call to choose the card that maximizes rewards on each purchase. Built end to end with Cursor and Claude across 45 consecutive days. Stripe Connect handles the actual routing.",
  stack: ["Next.js", "Stripe Connect", "Supabase", "Cursor + Claude"],
  label: "Personal · experiment",
  year: "2025",
  readTime: "~3 min read",
  audience: "For myself, as a build-discipline experiment",
  outcome: "45 days of consecutive shipping. Production AI patterns I reuse since.",
  architectureSteps: [
    "Authorize your cards once",
    "Set rules or auto router",
    "Make a purchase",
    "Paysplitt picks the optimal card",
    "Stripe Connect captures the charge",
  ],
};

export const PROJECTS: Project[] = [
  GTM_SIGNAL,
  EARLY_WARNING,
  WBR_COPILOT,
  DATA_DICTIONARY,
  SAS_AGENT,
  ESCAPE_ROOM,
  LIQUOR_STORE,
  PAYSPLITT,
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
