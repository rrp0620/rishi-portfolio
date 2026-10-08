import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_BOTS, getDemoBot } from "@/lib/demo-bots";
import { DemoChat } from "@/components/demo-chat";

export function generateStaticParams() {
  return DEMO_BOTS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bot = getDemoBot(slug);
  if (!bot) return {};
  return {
    title: `AI assistant demo for ${bot.name}`,
    description: `A live AI support assistant trained on ${bot.name}'s website. Built by Websage.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `Live AI assistant for ${bot.name}`,
      description: `Try the assistant trained on ${bot.name}'s website. Built by Websage.`,
    },
    twitter: {
      title: `Live AI assistant for ${bot.name}`,
      description: `Try the assistant trained on ${bot.name}'s website. Built by Websage.`,
    },
  };
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bot = getDemoBot(slug);
  if (!bot) notFound();
  const host = bot.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#111]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1fr_420px] md:py-16">
        <section className="flex flex-col justify-center">
          <div
            className="mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ background: bot.accent + "18", color: bot.accent }}
          >
            Live demo · built for {bot.name}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">
            Your website, answering customers 24/7.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-black/70">
            This assistant already read {host}{" "}and answers the questions your team gets asked
            every day: prices, hours, policies, booking. When it can&apos;t answer, or someone
            wants a person, it collects their info and hands it to your team.
          </p>
          <ul className="mt-6 space-y-2 text-[15px] text-black/75">
            <li>✓ Answers only from your own site, never makes up prices</li>
            <li>✓ Works nights and weekends, when the phones don&apos;t</li>
            <li>✓ Captures leads and sends them straight to you</li>
            <li>✓ Monthly report: top questions and what customers asked that your site doesn&apos;t answer</li>
          </ul>
          <p className="mt-8 text-sm text-black/50">
            Try it on the right. Ask it anything a customer would.
          </p>
        </section>

        <section>
          <DemoChat
            slug={bot.slug}
            name={bot.name}
            accent={bot.accent}
            greeting={bot.greeting}
            starters={bot.starters}
            handoff={bot.handoff}
          />
        </section>
      </div>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs leading-relaxed text-black/45">
        Demo built by Websage Inc. (websageinc.com) using publicly available information from{" "}
        {host}. Not an official {bot.name} service, and answers may not reflect recent changes.
        Questions about this demo: Rishi Patel, info@websageinc.com.
      </footer>
    </main>
  );
}
