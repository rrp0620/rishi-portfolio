import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { PROJECTS, type Project } from "@/lib/projects";

/**
 * Projects section. Bordered card stack on the dark page background.
 *
 * Design discipline:
 *   - One accent color (amber). Borders are muted at rest; on hover the
 *     border + the numeral + the "read" underline all snap to amber.
 *   - Hierarchy through scale and weight, not color variety.
 *   - Generous internal padding (8/12) so each card feels like its own
 *     surface, not a list row.
 *   - Numerals (01-07) sit in display serif on the left as the visual
 *     anchor — restrained at rest, amber on hover, ornament not decoration.
 *   - Card width stays inside the page container (max-w-5xl). Earlier
 *     full-bleed band approach was too loud once the per-block colors
 *     came off.
 */
export function WorkSection() {
  return (
    <section id="work" className="space-y-8 scroll-mt-24">
      <SectionHeader
        label="Projects"
        meta={`${String(PROJECTS.length).padStart(2, "0")} total`}
      />

      <p className="max-w-2xl text-base leading-relaxed text-foreground/85">
        Day-job builds for the executive team I report to up top, then the
        case study, then customer builds, then a personal experiment. Same
        methodology across all of them. Click any card for the walkthrough.
      </p>

      <ul className="space-y-3">
        {PROJECTS.map((project, i) => (
          <li key={project.slug}>
            <ProjectCard project={project} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const num = String(index + 1).padStart(2, "0");

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-sm border border-border bg-card transition-colors duration-200 hover:border-accent"
    >
      <article className="grid grid-cols-[auto_1fr] items-start gap-x-6 p-6 md:gap-x-12 md:p-10">
        {/* Numeral. Heavy sans to match the hero. Restrained at 30%
            opacity at rest, snaps to full amber on hover. */}
        <div
          aria-hidden
          className="text-5xl font-black leading-none tracking-tight text-foreground/30 transition-colors duration-200 group-hover:text-accent md:text-7xl"
        >
          {num}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="label text-muted-foreground">
            {project.label} · {project.year}
          </div>

          <h3 className="text-2xl font-black leading-[1.15] tracking-tight text-foreground md:text-4xl">
            {project.title}
          </h3>

          <p className="label text-muted-foreground">{project.audience}</p>

          <p className="max-w-2xl text-base leading-relaxed text-foreground/85">
            {project.subtitle}
          </p>

          {project.outcome ? (
            <p className="max-w-2xl text-base font-medium text-foreground">
              {project.outcome}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {project.stack.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-[0.7rem] tracking-wide text-foreground/70"
              >
                {tool}
              </span>
            ))}
          </div>

          <div className="pt-3">
            <span className="text-sm font-medium text-foreground underline decoration-2 decoration-accent underline-offset-[6px] transition-transform duration-200 group-hover:translate-x-1">
              Read the walkthrough →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
