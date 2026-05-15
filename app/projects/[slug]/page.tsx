import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { remark } from "remark";
import html from "remark-html";

import { PageHeader } from "@/components/page-header";
import { FlowSteps } from "@/components/flow-steps";
import { EscapeRoomArchitecture } from "@/components/diagrams/escape-room-architecture";
import { PROJECTS, getProject } from "@/lib/projects";

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title} · ${project.label.toLowerCase()} · Rishi Patel`,
    description: project.summary,
  };
}

async function getProjectContent(slug: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), "content/projects", `${slug}.md`);
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const processed = await remark().use(html).process(fileContents);
    return processed.toString();
  } catch {
    return null;
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const contentHtml = await getProjectContent(slug);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pt-12 pb-16 md:pt-16 md:pb-24">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="label-mono text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Home
        </Link>

        {/* Metadata ribbon */}
        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 label-mono text-muted-foreground">
          <span className="text-foreground">{project.label}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{project.year}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{project.readTime}</span>
        </div>

        {/* Hero */}
        <header className="mt-6 space-y-5 border-b border-border pb-10">
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {project.title}.
          </h1>
          <p className="max-w-2xl font-display text-xl italic leading-snug text-muted-foreground md:text-2xl">
            {project.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {project.stack.map((tool) => (
              <span
                key={tool}
                className="label-mono inline-flex items-center rounded-sm border border-border bg-card px-1.5 py-0.5 text-foreground/70"
              >
                {tool}
              </span>
            ))}
          </div>

          {project.liveUrl && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
              <Link
                href={project.liveUrl}
                className="border-b border-accent transition-colors hover:bg-accent/10"
                target="_blank"
                rel="noreferrer"
              >
                Live →
              </Link>
            </div>
          )}
        </header>

        {/* Visual: architecture diagram for the case study, or a flow
            visualization for the build-notes / experiment pages. */}
        {project.slug === "escape-room" ? (
          <div className="mt-12">
            <EscapeRoomArchitecture />
          </div>
        ) : project.architectureSteps ? (
          <div className="mt-12">
            <FlowSteps
              steps={project.architectureSteps}
              label="How it runs end-to-end"
            />
          </div>
        ) : null}

        {/* Body. The page container is wide (max-w-5xl), but prose stays
            at max-w-3xl so line length remains scannable. The diagram
            and the FlowSteps above are free to fill the wider container. */}
        {contentHtml ? (
          <article
            className="prose mt-12 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="mt-12 italic text-muted-foreground">
            Walkthrough coming soon.
          </p>
        )}

        {/* Back to home */}
        <div className="mt-20 border-t border-border pt-8">
          <Link
            href="/"
            className="label-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
