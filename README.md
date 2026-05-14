# rishi-portfolio

Personal portfolio for an applied-AI job search. Live at **[rishi-portfolio-brown.vercel.app](https://rishi-portfolio-brown.vercel.app)**.

The site is a small Next.js app on Vercel with five project case studies and one live AI demo. The demo (`/api/audit`) is a Gemini-powered use-case audit that takes a company name and a workflow description, runs a quick web search on the company, and returns a structured audit covering friction points, AI fit, and one specific pilot worth running. It exists so anyone visiting the site can experience the kind of work I'd do in an applied-AI role rather than just read about it.

## Stack

Next.js 16 (App Router, TypeScript, Turbopack), Tailwind v4, shadcn/ui for primitives, Gemini 2.5 Flash via the Google Generative Language API for the audit demo, Vercel for hosting. Roughly 95% of the code was written through Cursor and Claude Code.

## Run it locally

```bash
git clone https://github.com/rrp0620/rishi-portfolio.git
cd rishi-portfolio
cp .env.example .env.local       # then add your Google API key
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The audit demo requires `GOOGLE_API_KEY` to be set; without it, the route returns a polite "demo is offline" message and the rest of the site works fine.

Free Gemini API keys are available at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Free tier covers 15 requests/minute and 1,500/day on `gemini-2.5-flash`, which is more than enough for the demo's traffic.

## Project structure

```
app/                          # Next.js routes
  api/audit/route.ts          # Gemini-backed use-case audit endpoint
  projects/[slug]/page.tsx    # Per-project case-study pages
  page.tsx                    # Homepage (hero → about → work → audit → contact)
  layout.tsx                  # Root layout, fonts, metadata
  opengraph-image.tsx         # OG image for social cards
components/
  audit-demo.tsx              # Client component for the live audit demo
  work-section.tsx            # Project card list on the homepage
  flow-steps.tsx              # Reusable numbered-step flow visualization
  diagrams/                   # Project-specific diagrams
content/projects/             # Markdown bodies for each case study
lib/projects.ts               # Canonical project list driving the gallery and routes
public/                       # Static assets
```

To add a new project, edit `lib/projects.ts` (one entry per project) and drop a matching markdown file in `content/projects/{slug}.md`. The dynamic route at `app/projects/[slug]/page.tsx` reads from both.

## How the audit demo works

`/api/audit` is a Node serverless route. On each POST:

1. Validates the input (company name + workflow description, length-checked).
2. Rate-limits per IP in-memory (5 requests/hour). Imperfect on serverless cold starts but adequate for a portfolio.
3. Calls Gemini with the `google_search` tool attached. If that call fails for any reason (model issue, tool unavailable, timeout, etc.), retries without tools using strict JSON-mode output.
4. Parses the response with a permissive normalizer that fills missing fields with empty defaults rather than rejecting partial responses.
5. Returns a structured `AuditResult` the client renders as a card with friction list, AI-fit columns, pilot recommendation, and a flow visualization.

The system prompt in `app/api/audit/route.ts` is the most interesting file in the repo. It carries about 50 voice rules (banned words, banned phrases, rule-of-three avoidance, no Bold-term-explanation lists) so the model's output blends into the rest of the site's editorial voice. Worth reading if you're curious how to keep an LLM from sounding like an LLM.

## Notable design choices

The whole site sticks to one container width (`max-w-5xl`) with prose constrained to `max-w-3xl` where it appears. Fonts are Fraunces (display), Inter (body), and JetBrains Mono (metadata), loaded via `next/font`. The palette is a warm cream paper background with a terra-cotta accent, with a matching warm-dark mode auto-applied via `prefers-color-scheme`.

No animations, no scroll-triggered effects, no glow, no gradient mesh. The site is intentionally restrained because most AI portfolios overdo this part.

## License

MIT. See `LICENSE`.
