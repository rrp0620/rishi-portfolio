import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function CaseStudy() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        BI before AI — case study
      </h2>
      <p className="text-base leading-relaxed">
        The full write-up of the Novus engagement. Friction audit, BI
        foundation, AI layer mapped to specific frictions, and a 30/60/90
        rollout plan for a non-technical owner. Closes with what I'd do
        differently as a forward-deployed strategist for an AI vendor.
      </p>
      {/* TODO: replace href with your published case study URL (Notion sub-page or /case-study route) */}
      <Link
        href="/case-study"
        className={buttonVariants({ variant: "default" })}
      >
        Read the case study →
      </Link>
    </section>
  );
}
