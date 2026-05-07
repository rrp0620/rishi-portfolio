import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

export const metadata = {
  title: "BI before AI — a small-business case study | Rishi Patel",
  description:
    "Workflow audit, BI foundation, AI layer, and 30/60/90 rollout plan for a non-technical owner. Drawn from a real engagement with a 4-room escape-room business.",
};

async function getCaseStudy() {
  const filePath = path.join(process.cwd(), "content/case-study.md");
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const processed = await remark().use(html).process(content);
  return { data, html: processed.toString() };
}

export default async function CaseStudyPage() {
  const { html: content } = await getCaseStudy();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <article
        className="prose prose-stone dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="mt-12 border-t pt-8">
        <a
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
        >
          ← Back to portfolio
        </a>
      </div>
    </main>
  );
}
