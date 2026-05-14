"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/section-header";
import { FlowSteps } from "@/components/flow-steps";

export type AuditResult = {
  company: string;
  company_snapshot: string;
  where_it_bleeds: string[];
  where_ai_helps: string;
  where_ai_is_theater: string;
  pilot: {
    title: string;
    what: string;
    impact: string;
    flow: string[];
  };
};

const EXAMPLES: Array<{ label: string; workflow: string }> = [
  {
    label: "Outbound research",
    workflow:
      "Our SDRs spend half their day researching prospects before outbound. Most of it is reading LinkedIn and company sites and pasting context into a spreadsheet.",
  },
  {
    label: "Support triage",
    workflow:
      "Our support team handles ~500 tickets a day across 4 product areas. Triage takes 3 minutes per ticket and goes to the wrong queue often enough that response SLAs slip.",
  },
  {
    label: "Webinar production",
    workflow:
      "Marketing runs ~30 webinars a quarter. Each one takes a producer most of a week to plan, promote, and recap. The content lives in a Drive folder nobody opens after the event.",
  },
];

type DemoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; result: AuditResult }
  | { kind: "error"; message: string };

export function AuditDemo() {
  const [company, setCompany] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [state, setState] = useState<DemoState>({ kind: "idle" });

  const canSubmit =
    state.kind !== "loading" &&
    company.trim().length > 1 &&
    workflow.trim().length > 30;

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: company.trim(), workflow: workflow.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({
          kind: "error",
          message: data?.error ?? "Something broke on the audit. Try again in a moment.",
        });
        return;
      }

      setState({ kind: "result", result: data as AuditResult });
    } catch {
      setState({
        kind: "error",
        message:
          "I couldn't reach the audit service. Check your connection and try again.",
      });
    }
  }

  function loadExample(idx: number) {
    const ex = EXAMPLES[idx];
    setWorkflow(ex.workflow);
    setState({ kind: "idle" });
  }

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <section id="audit" className="space-y-8 scroll-mt-24">
      <SectionHeader
        number="03"
        label="Try the audit"
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
            />
            <span className="text-accent">Live</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>Powered by Gemini</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-[1fr_2fr]">
        <p className="font-display text-2xl leading-[1.2] tracking-tight text-foreground md:text-[1.65rem]">
          An AI use-case audit you can run right now.
        </p>
        <div className="space-y-4 text-base leading-relaxed text-foreground/85">
          <p>
            Below is a working demo of the kind of audit I&apos;d run on
            day one of an applied-AI role. Type in a company name and
            describe any workflow that eats more time than it should.
            Gemini will run a quick search to learn what the company
            actually does, then come back with an honest read on whether
            AI is the right tool for the problem and one specific pilot
            recommendation if it is.
          </p>
          <p>
            Built directly against the Gemini API on a serverless route
            under this domain, with Google Search grounding turned on.
            The output you see is generated live, not pre-recorded.
          </p>
        </div>
      </div>

      {/* Form */}
      {state.kind !== "result" && (
        <form
          onSubmit={runAudit}
          className="space-y-6 rounded-md border border-border bg-card p-6 md:p-8"
        >
          <div className="space-y-2">
            <label
              htmlFor="audit-company"
              className="label-mono block text-foreground"
            >
              Company
            </label>
            <input
              id="audit-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Any company name. Yours, a portfolio company, anything."
              disabled={state.kind === "loading"}
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-base text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="audit-workflow"
              className="label-mono block text-foreground"
            >
              The workflow
            </label>
            <textarea
              id="audit-workflow"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              placeholder="e.g. Our SDRs spend half their day researching prospects before outbound. Most of it is reading LinkedIn and company sites and pasting into a spreadsheet."
              rows={5}
              disabled={state.kind === "loading"}
              className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-base leading-relaxed text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <p className="label-mono text-muted-foreground">
              At least one sentence. More detail gets a better audit.
            </p>
          </div>

          {/* Example chips */}
          <div className="space-y-2">
            <div className="label-mono text-muted-foreground">
              Or try one of these
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => loadExample(i)}
                  disabled={state.kind === "loading"}
                  className="label-mono rounded-sm border border-border bg-background px-2 py-1 text-foreground/75 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {ex.label}
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
                  Researching and running the audit
                </>
              ) : (
                <>
                  Run the audit
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
            <span className="label-mono text-muted-foreground">
              15-30 seconds, including the web search
            </span>
          </div>

          {state.kind === "error" && (
            <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-foreground/80">
              {state.message}
            </p>
          )}
        </form>
      )}

      {/* Result */}
      {state.kind === "result" && (
        <AuditOutput result={state.result} onReset={reset} />
      )}

      <p className="label-mono text-muted-foreground">
        Rate-limited to five audits per session. If you want a deeper one,{" "}
        <a
          href="mailto:rrp0620@gmail.com?subject=AI%20use-case%20audit"
          className="border-b border-accent text-foreground transition-colors hover:bg-accent/10"
        >
          email me
        </a>
        .
      </p>
    </section>
  );
}

function AuditOutput({
  result,
  onReset,
}: {
  result: AuditResult;
  onReset: () => void;
}) {
  return (
    <article className="space-y-10 rounded-md border border-border bg-card p-6 md:p-8">
      <header className="space-y-5 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="label-mono text-muted-foreground">
              Audit for {result.company || "your company"}
            </div>
            <h3 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              Here&apos;s what I&apos;d look at.
            </h3>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="label-mono text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Run another
          </button>
        </div>

        {/* Company snapshot — grounds the audit in real research */}
        {result.company_snapshot && (
          <div className="rounded-sm border border-border/60 bg-background p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 label-mono text-muted-foreground">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              />
              <span className="text-accent">From the web search</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              {result.company_snapshot}
            </p>
          </div>
        )}
      </header>

      {/* Where it bleeds */}
      <section className="space-y-4">
        <div className="label-mono text-muted-foreground">
          Where it bleeds
        </div>
        <ul className="space-y-3">
          {result.where_it_bleeds.map((point, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed text-foreground/85">
              <span className="numeral mt-0.5 w-6 shrink-0 text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* AI fit — two columns */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-sm border border-border/60 bg-background p-5">
          <div className="label-mono text-muted-foreground">
            Where AI actually helps
          </div>
          <p className="text-base leading-relaxed text-foreground/85">
            {result.where_ai_helps}
          </p>
        </div>
        <div className="space-y-3 rounded-sm border border-border/60 bg-background p-5">
          <div className="label-mono text-muted-foreground">
            Where AI would be theater
          </div>
          <p className="text-base leading-relaxed text-foreground/85">
            {result.where_ai_is_theater}
          </p>
        </div>
      </section>

      {/* Pilot */}
      <section className="space-y-5 border-t-2 border-accent pt-6">
        <div className="space-y-3">
          <div className="label-mono text-accent">
            The pilot I&apos;d ship first
          </div>
          <h4 className="font-display text-2xl font-medium leading-tight tracking-tight md:text-[1.75rem]">
            {result.pilot.title}
          </h4>
          <p className="text-base leading-relaxed text-foreground/85">
            {result.pilot.what}
          </p>
          <p className="font-display text-lg italic text-foreground">
            {result.pilot.impact}
          </p>
        </div>

        {/* Pilot flow visualization */}
        {result.pilot.flow && result.pilot.flow.length > 0 && (
          <FlowSteps
            steps={result.pilot.flow}
            label="What the pilot looks like end-to-end"
          />
        )}
      </section>
    </article>
  );
}
