import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  /** Section label — plain string, no leading number prefix. */
  label: string;
  /** Optional right-aligned metadata. Accepts a string or JSX. */
  meta?: React.ReactNode;
  className?: string;
};

/**
 * Section marker. Small uppercased label on the left, optional metadata
 * on the right, an amber accent rule underneath. The amber rule echoes
 * the highlighter behind the hero name and the underlines on the hero
 * CTAs — the "yellow contrast fine line" tying the whole site together.
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
      <div className="rule-accent" />
    </div>
  );
}
