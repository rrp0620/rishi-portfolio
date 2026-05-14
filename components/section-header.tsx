import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** Two-digit section number — "01", "02"... */
  number: string;
  /** Section label — ABOUT, PROJECTS, CONTACT */
  label: string;
  /** Optional right-aligned metadata, in monospace. Accepts a string or
   *  JSX so individual sections can add accent dots, colour, etc. */
  meta?: React.ReactNode;
  className?: string;
};

/**
 * Editorial section header used as the spine of the homepage.
 *
 *   01 / ABOUT                                      AVAILABLE NOW
 *   ────────────────────────────────────────────────────────────
 */
export function SectionHeader({
  number,
  label,
  meta,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3 label-mono text-muted-foreground">
          <span className="text-foreground">{number}</span>
          <span aria-hidden className="text-muted-foreground/60">
            /
          </span>
          <span>{label}</span>
        </div>
        {meta ? (
          <span className="label-mono text-muted-foreground">{meta}</span>
        ) : null}
      </div>
      <div className="rule" />
    </div>
  );
}
