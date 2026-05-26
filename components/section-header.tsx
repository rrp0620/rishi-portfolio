import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** Section label — kept as a plain string. No leading "01 /" prefix anymore. */
  label: string;
  /** Optional right-aligned metadata. Accepts a string or JSX. */
  meta?: React.ReactNode;
  className?: string;
};

/**
 * A simple section marker. A small uppercased label on the left, optional
 * metadata on the right, a hairline rule underneath. Replaces the previous
 * "01 / ABOUT" numbered editorial header — that pattern had become a tell
 * across AI-built portfolios.
 */
export function SectionHeader({
  label,
  meta,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <span className="label text-muted-foreground">{label}</span>
        {meta ? (
          <span className="label text-muted-foreground">{meta}</span>
        ) : null}
      </div>
      <div className="rule" />
    </div>
  );
}
