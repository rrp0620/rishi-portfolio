import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { PROJECTS, type Project } from "@/lib/projects";

/**
 * Work section. Seven projects, ordered for an AI Outcomes / AI deployment
 * hiring manager: day-job enterprise builds first, then the customer-facing
 * case study, then other client builds, then the personal experiment.
 *
 * Card layout: title + audience + subtitle, summary, stack chips, outcome
 * line, meta on the right. No italics, no monospace tags, no decorative
 * numbering.
 */
export function WorkSection() {
  return (
    <section id="work" className="space-y-8 scroll-mt-24">
      <SectionHeader
        label="Selected work"
        meta={`${PROJECTS.length} projects`}
      />

      <p className="max-w-2xl text-base leading-relaxed text-foreground/85">
        Day-job builds for the executive team I report to up top, then the
        case study, then customer builds, then a personal experiment. Same
        methodology across all of them. Click any project for the
        walkthrough.
      </p>

      <ul className="divide-y divide-border">
        {PROJECTS.map((project) => (
          <li key={project.slug}>
            <ProjectRow project={project} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block py-7 transition-colors hover:bg-secondary/40"
    >
      <article className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4 md:hidden">
              <span className="label text-muted-foreground">
                {project.label} · {project.year}
              </span>
            </div>
            <h3 className="text-xl font-semibold leading-tight tracking-tight md:text-2xl">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                {project.title}
              </span>
            </h3>
            <p className="label text-muted-foreground">{project.audience}</p>
            <p className="max-w-2xl text-base leading-snug text-foreground/80">
              {project.subtitle}
            </p>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-foreground/70">
            {project.summary}
          </p>

          {project.outcome ? (
            <p className="max-w-2xl text-sm font-medium text-foreground">
              {project.outcome}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.stack.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center rounded-sm border border-border bg-card px-2 py-0.5 text-[0.7rem] tracking-wide text-foreground/70"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-1 md:flex md:pt-1">
          <span className="label text-muted-foreground">
            {project.label}
          </span>
          <span className="label text-muted-foreground">{project.year}</span>
          <span className="mt-2 text-sm text-accent transition-transform duration-200 group-hover:translate-x-1">
            Read →
          </span>
        </div>
      </article>
    </Link>
  );
}
