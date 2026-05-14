import { cn } from "@/lib/utils";

type FlowStepsProps = {
  /** The ordered steps to render. Each one is a short label, 2-5 words. */
  steps: string[];
  /** Mono label above the flow. Defaults to "Flow". */
  label?: string;
  /** Optional class for the outer container. */
  className?: string;
};

/**
 * A small numbered step flow. Renders horizontally on desktop using an
 * auto-fit grid so any step count from 3 to 6 lays out cleanly, and
 * stacks vertically on mobile. Each step gets a mono numeral in the
 * accent colour and a one-line description in body sans.
 *
 * Editorial style: hairline borders, paper card backgrounds, no chevrons
 * between steps — order does the work.
 */
export function FlowSteps({ steps, label = "Flow", className }: FlowStepsProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="label-mono text-muted-foreground">{label}</div>
        <div className="label-mono text-muted-foreground/70">
          {String(steps.length).padStart(2, "0")} steps
        </div>
      </div>

      <ol
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-sm border border-border bg-card p-3"
          >
            <span className="label-mono text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-snug text-foreground/85">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
