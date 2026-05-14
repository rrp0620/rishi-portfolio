import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { PROJECTS, type Project } from "@/lib/projects";

export function WorkSection() {
  const total = String(PROJECTS.length).padStart(2, "0");

  return (
    <section id="work" className="space-y-8 scroll-mt-24">
      <SectionHeader
        number="02"
        label="Work"
        meta={`${total} projects · 2025-2026`}
      />

      <p className="max-w-2xl text-base leading-relaxed text-foreground/85">
        Five projects, listed in the order I&apos;d hand them to a recruiter.
        Day-job builds at a public company up top, then a longer case study,
        then two small-business engagements and a personal experiment. The
        methodology is the same across all of them. Click any one for the
        walkthrough.
      </p>

      <div className="divide-y divide-border/70 border-y border-border/70">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block py-6 transition-colors hover:bg-accent/5"
    >
      <article className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-medium leading-tight tracking-tight">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                {project.title}
              </span>
            </h3>
            <p className="font-display text-base italic leading-snug text-muted-foreground">
              {project.subtitle}
            </p>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
            {project.summary}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.stack.map((tool) => (
              <span
                key={tool}
                className="label-mono inline-flex items-center rounded-sm border border-border bg-card px-1.5 py-0.5 text-foreground/70"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 md:items-end md:pt-2">
          <span className="label-mono text-muted-foreground">
            {project.label} · {project.year}
          </span>
          <span className="label-mono text-accent transition-transform duration-200 group-hover:translate-x-1">
            Read →
          </span>
        </div>
      </article>
    </Link>
  );
}
