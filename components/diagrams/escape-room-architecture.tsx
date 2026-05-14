import { cn } from "@/lib/utils";

/**
 * Architecture-at-a-glance diagram for the escape-room project page.
 *
 * Renders as a four-tier vertical stack: raw sources at the bottom,
 * Supabase warehouse, materialized views, then the user surfaces at the
 * top. Connector lines between tiers carry the visual flow without
 * needing real SVG paths.
 *
 * Editorial styling: hairline borders, mono labels, accent on the two
 * "load-bearing" tiers (warehouse + AI surfaces). No shadows, no glow,
 * no icons.
 */
export function EscapeRoomArchitecture() {
  return (
    <figure className="space-y-5 rounded-md border border-border bg-card p-6 md:p-8">
      <figcaption className="space-y-2">
        <div className="label-mono text-muted-foreground">
          Architecture · at a glance
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">
          Data flows up. Three sources land in Supabase. Materialized views
          fan that into the dashboard and the two AI surfaces.
        </p>
      </figcaption>

      <div className="space-y-1.5">
        {/* User-facing surfaces */}
        <Tier label="User surfaces">
          <Box accent>
            <BoxTitle>Dashboard</BoxTitle>
            <BoxSub>6 pages, owner-facing</BoxSub>
          </Box>
          <Box accent>
            <BoxTitle>Profit Coach</BoxTitle>
            <BoxSub>Gemini · structured output</BoxSub>
          </Box>
          <Box accent>
            <BoxTitle>Ask Anything</BoxTitle>
            <BoxSub>Gemini · NL → SQL</BoxSub>
          </Box>
        </Tier>

        <Connector />

        {/* Materialized views */}
        <Tier label="Read layer">
          <Box wide>
            <BoxTitle>Materialized views</BoxTitle>
            <BoxSub>
              mv_daily_revenue · mv_monthly_summary · by-room · by-time-slot
            </BoxSub>
          </Box>
        </Tier>

        <Connector />

        {/* Warehouse */}
        <Tier label="Warehouse">
          <Box wide strong>
            <BoxTitle>Supabase</BoxTitle>
            <BoxSub>bookings · time_entries · fixed_expenses</BoxSub>
          </Box>
        </Tier>

        <Connector />

        {/* Raw sources */}
        <Tier label="Sources">
          <Box>
            <BoxTitle>Bookeo</BoxTitle>
            <BoxSub>bookings, nightly sync</BoxSub>
          </Box>
          <Box>
            <BoxTitle>Homebase</BoxTitle>
            <BoxSub>labor, nightly sync</BoxSub>
          </Box>
          <Box>
            <BoxTitle>Spreadsheet</BoxTitle>
            <BoxSub>fixed expenses, owner-edited</BoxSub>
          </Box>
        </Tier>
      </div>
    </figure>
  );
}

function Tier({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[100px_1fr] md:items-stretch md:gap-3">
      <div className="flex md:items-center">
        <span className="label-mono text-muted-foreground/80">{label}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        {children}
      </div>
    </div>
  );
}

function Box({
  children,
  accent = false,
  strong = false,
  wide = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-sm border bg-background px-3 py-2.5",
        accent && "border-accent/60",
        strong && "border-2 border-accent",
        !accent && !strong && "border-border",
        wide && "w-full",
      )}
    >
      {children}
    </div>
  );
}

function BoxTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-sm font-medium leading-tight tracking-tight text-foreground">
      {children}
    </div>
  );
}

function BoxSub({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-mono mt-1 text-muted-foreground">{children}</div>
  );
}

function Connector() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] md:gap-3" aria-hidden>
      <div />
      <div className="flex justify-center py-1">
        <div className="h-4 w-px bg-border" />
      </div>
    </div>
  );
}
