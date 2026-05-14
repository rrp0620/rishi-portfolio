export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  stack: string[];
  /** Meta-ribbon label on the project page. e.g. "Case study", "Build notes", "Experiment". */
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
};

/**
 * Canonical project list. There is no "featured" project: everything is
 * rendered as an equal card on the homepage and the visitor decides
 * which to read first. Order matters because order is the only signal
 * a reader gets about priority.
 *
 * Current order, deliberate:
 *   1. Data dictionary  — enterprise scale, AI for unstructured-context
 *      consolidation. Leads because this is the strongest match for
 *      AI Outcomes / Adoption roles at any company size.
 *   2. SAS coding agent — enterprise scale, team enablement, the
 *      prompt-blueprint-as-handoff pattern at a public company.
 *   3. Escape room       — case study. Full BI + AI architecture for a
 *      small business. The work and the methodology are the same as at
 *      enterprise; only the scope is smaller.
 *   4. Liquor store      — two builds for one small-business owner;
 *      shows the same engagement working over multiple use cases.
 *   5. Paysplitt         — personal experiment, AI-coded product.
 *
 * Edit this file, not the components, to add or reorder projects.
 */

export const DATA_DICTIONARY: Project = {
  slug: "data-dictionary",
  title: "A cross-team data dictionary",
  subtitle:
    "Hundreds of SAS tables at a public company used different aliases for the same field. After a recent reorg, nobody could keep them straight.",
  summary:
    "The analytics org at my day job has been running on SAS for over a decade, and the same field shows up in three or four different tables under different abbreviations depending on which team built them. A recent reorganization moved a lot of folks across workstreams, and getting up to speed on a metric you didn't own a month ago turned into a multi-day exercise. I built a Copilot-driven agent that consolidates field-level metadata from emails, Confluence, Teams threads, and SAS itself, then surfaces it as a searchable Excel dictionary. New owners of a metric can now get up to speed in an afternoon.",
  stack: ["Microsoft 365 Copilot", "Confluence", "SAS", "Excel"],
  label: "Internal build",
  year: "2026",
  readTime: "~3 min read",
  architectureSteps: [
    "Copilot pulls enterprise context",
    "Agent cross-references SAS metadata",
    "Resolve known aliases per field",
    "Build one record per field",
    "Excel lookup surfaces the dictionary",
  ],
};

export const SAS_AGENT: Project = {
  slug: "sas-agent",
  title: "A SAS coding agent for the analytics team",
  subtitle:
    "Cut my reporting time in half, then I documented the prompt scaffold so the rest of the team could tune their own version.",
  summary:
    "A Copilot-driven coding agent tuned to our SAS environment that drafts working programs from a one-paragraph problem statement. My own throughput on ad-hoc reports roughly doubled. Once it was working, I wrote down the prompt scaffold and the iteration questions I'd used to build it, then walked each other analyst through adapting it to their own reporting patterns. Within a few weeks several analysts were running their own tuned versions of the agent against their own workstreams.",
  stack: ["Microsoft 365 Copilot", "SAS", "Prompt design"],
  label: "Internal build + team enablement",
  year: "2026",
  readTime: "~3 min read",
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
  title: "An escape room",
  subtitle:
    "A BI + AI system for a single-location escape-room business that had been losing money every month for three years.",
  summary:
    "A friend who runs a single-location escape room was losing money every month and couldn't tell exactly why. I built them a Supabase warehouse that consolidated their bookings, labor, and fixed-expense data, then put a Gemini-powered Profit Coach and a plain-English Ask-Anything box on top of it. About 5,000 paid bookings of real data underneath the model. The scope is small-business, but the methodology (discovery, BI foundation, thin AI layer, safe-handoff scripts) is the same one I'd run at any scale.",
  stack: [
    "Bookeo",
    "Homebase",
    "Supabase",
    "Gemini",
    "Edge Functions",
    "TypeScript",
  ],
  label: "Case study",
  year: "2026",
  readTime: "~8 min read",
  // architectureSteps intentionally omitted; this project uses the
  // EscapeRoomArchitecture diagram component instead.
};

export const LIQUOR_STORE: Project = {
  slug: "liquor-store",
  title: "Two AI tools for a liquor store",
  subtitle:
    "Two builds for one owner: distributor invoice parsing and weekly ordering grounded in seven years of POS history.",
  summary:
    "Same small-business owner, two distinct builds over the past year. The first agent parses distributor invoice PDFs into POS-ready CSVs in the background, saving roughly two hours a week. The second is a reasoning layer on the same POS that ranks SKUs for the weekly order against seven years of sales history, current stock, and an owner-maintained holidays-and-events table. Both ship with the same prompt-generator script pattern that lets the owner safely change how the AI behaves without breaking production.",
  stack: ["Gmail API", "POS API", "Claude", "Supabase", "Next.js"],
  label: "Build notes",
  year: "2025-2026",
  readTime: "~6 min read",
  architectureSteps: [
    "Identify the manual workflow",
    "Wire up data + AI layer",
    "Ship inside owner's existing tools",
    "Hand off prompt-generator script",
    "Owner runs and tunes it solo",
  ],
};

export const PAYSPLITT: Project = {
  slug: "paysplitt",
  title: "Paysplitt",
  subtitle:
    "An AI-built spending router that splits your purchases across credit cards by rule or by rewards.",
  summary:
    "Paysplitt routes everyday spending across your credit cards based on rules you configure. You can set spending caps per card, or pin certain merchant categories to certain cards. An auto-router mode picks the card that maximizes rewards points on each purchase. Built end-to-end with Cursor and Claude in a couple weekends, with Stripe Connect handling the actual routing. Live at paysplitt.com.",
  stack: ["Next.js", "Stripe Connect", "Supabase", "Cursor + Claude"],
  label: "Live project",
  year: "2025",
  readTime: "~3 min read",
  liveUrl: "https://paysplitt.com",
  architectureSteps: [
    "Authorize your cards once",
    "Set rules or auto-router",
    "Make a purchase",
    "Paysplitt picks the optimal card",
    "Stripe Connect captures the charge",
  ],
};

/**
 * Every project in display order. The homepage renders this list as a
 * flat stack of cards (no featured block). Used directly by both the
 * homepage WorkSection and the static params for /projects/[slug].
 */
export const PROJECTS: Project[] = [
  DATA_DICTIONARY,
  SAS_AGENT,
  ESCAPE_ROOM,
  LIQUOR_STORE,
  PAYSPLITT,
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
