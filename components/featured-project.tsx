import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STACK = [
  "Bookeo",
  "Homebase",
  "Supabase",
  "Gemini",
  "Edge Functions",
  "TypeScript",
];

export function FeaturedProject() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Novus — BI + AI dashboard for a 4-room escape-room business
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          The owner was running their P&L in a spreadsheet that was always two
          weeks behind real time. They had real questions about pricing,
          staffing, and underperforming time slots, but no time to be a data
          analyst. So I built them a system.
        </p>
      </div>

      {/* Loom embed */}
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
        {/* TODO: replace with your real Loom URL */}
        <iframe
          src="https://www.loom.com/embed/REPLACE_WITH_LOOM_ID"
          allowFullScreen
          className="h-full w-full"
          title="Novus dashboard walkthrough"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STACK.map((tool) => (
          <Badge key={tool} variant="secondary">
            {tool}
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6 text-base leading-relaxed">
          <p>
            The BI layer wires Bookeo (booking system), Homebase (labor data),
            and Supabase into a unified profitability dashboard. Profit per
            booking, per room, per time slot, in real time. ~5,000 bookings of
            real data running through it.
          </p>
          <p>Two AI features on top:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Profit Coach.</strong> A Gemini-powered analyst that
              watches the data and surfaces underperforming time slots with the
              actual reason — pricing, staffing, demand. Not just "this room is
              down" but "this room is down because pricing is 15% above the
              market rate."
            </li>
            <li>
              <strong>Ask Anything.</strong> Natural language over the schema.
              The owner asks a question in plain English, gets a structured
              answer in seconds with the SQL attached so they can verify.
            </li>
          </ul>
          <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
            The thesis: BI before AI. AI on top of bad data is just
            confident-sounding noise. This system works because the model has
            clean, real numbers underneath it, with real context.
          </blockquote>
        </CardContent>
      </Card>
    </section>
  );
}
