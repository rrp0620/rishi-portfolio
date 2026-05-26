"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/section-header";

export type AskResult = {
  answer: string;
  sources: { slug: string; title: string }[];
};

const EXAMPLES: string[] = [
  "What would you build in your first 90 days at an AI vendor?",
  "How do you scope an AI pilot?",
  "Why BI before AI?",
  "Where doesn't AI help?",
  "Your strongest project for a Forward Deployed role?",
];

type AskState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; result: AskResult; question: string }
  | { kind: "error"; message: string };

export function AskRishi() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ kind: "idle" });

  const canSubmit = state.kind !== "loading" && question.trim().length > 3;

  async function ask(q: string) {
    setQuestion(q);
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({
          kind: "error",
          message:
            data?.error ?? "Something broke on the model. Try again in a moment.",
        });
        return;
      }
      setState({ kind: "result", result: data as AskResult, question: q });
    } catch {
      setState({
        kind: "error",
        message: "Couldn't reach the model. Check your connection and retry.",
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    ask(question.trim());
  }

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <section id="ask" className="space-y-8 scroll-mt-24">
      <SectionHeader
        label="Ask me anything"
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
            />
            <span className="text-accent">Live</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>Grounded on this site</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="text-2xl font-semibold leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          The version of me that&apos;s read every page on this site.
        </p>
        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Ask anything about how I work, what I&apos;ve shipped, or how I
            think about AI deployment. The model is grounded on every
            project page, the case study, my résumé, and a voice file. It
            answers in my voice and cites the sources behind each answer
            so you can read further.
          </p>
          <p className="text-sm text-muted-foreground">
            Inspired by Caleb Ixca&apos;s Q&A tool. Built directly against
            the Gemini API. Five questions per session.
          </p>
        </div>
      </div>

      {/* Form */}
      {state.kind !== "result" && (
        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-sm border border-border bg-card p-6 md:p-8"
        >
          <div className="space-y-2">
            <label htmlFor="ask-question" className="label block text-foreground">
              Your question
            </label>
            <textarea
              id="ask-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What would you build in your first 90 days at Glean?"
              rows={3}
              disabled={state.kind === "loading"}
              className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-base leading-relaxed text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <div className="label text-muted-foreground">Or try one</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => ask(ex)}
                  disabled={state.kind === "loading"}
                  className="rounded-sm border border-border bg-background px-2.5 py-1 text-sm text-foreground/75 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.kind === "loading" ? (
                <>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-foreground/80" />
                  Thinking
                </>
              ) : (
                <>
                  Ask
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
            <span className="label text-muted-foreground">
              ~5 to 10 seconds
            </span>
          </div>

          {state.kind === "error" && (
            <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-foreground/80">
              {state.message}
            </p>
          )}
        </form>
      )}

      {state.kind === "result" && (
        <AnswerCard result={state.result} question={state.question} onReset={reset} />
      )}

      <p className="label text-muted-foreground">
        Rate limited to eight questions per session.
      </p>
    </section>
  );
}

function AnswerCard({
  result,
  question,
  onReset,
}: {
  result: AskResult;
  question: string;
  onReset: () => void;
}) {
  return (
    <article className="space-y-6 rounded-sm border border-border bg-card p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="label text-muted-foreground">You asked</div>
          <p className="max-w-2xl text-base font-medium leading-snug text-foreground">
            {question}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="label text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Ask another
        </button>
      </header>

      <div className="space-y-4 text-base leading-relaxed text-foreground/90">
        {result.answer.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {result.sources.length > 0 && (
        <footer className="space-y-2 border-t border-border pt-4">
          <div className="label text-muted-foreground">Grounded in</div>
          <div className="flex flex-wrap gap-2">
            {result.sources.map((s) => (
              <SourceChip key={s.slug} slug={s.slug} title={s.title} />
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}

// Slugs that map to a real project page get linked. Slugs from the FAQ
// (e.g. "first-90-days") render as quiet badges instead.
const PROJECT_SLUGS = new Set([
  "early-warning",
  "wbr-copilot",
  "data-dictionary",
  "sas-agent",
  "escape-room",
  "liquor-store",
  "paysplitt",
]);

function SourceChip({ slug, title }: { slug: string; title: string }) {
  if (PROJECT_SLUGS.has(slug)) {
    return (
      <Link
        href={`/projects/${slug}`}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-sm text-foreground/80 transition-colors hover:border-accent hover:text-accent"
      >
        {title}
        <span aria-hidden>→</span>
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-background px-2 py-1 text-sm text-foreground/70">
      {title}
    </span>
  );
}
