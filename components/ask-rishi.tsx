"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Floating chat bubble in the bottom-right corner. Click the bubble to
 * expand a chat panel. Multi-turn conversation with the Gemini-backed
 * /api/ask endpoint, grounded on the project pages and voice rules in
 * lib/knowledge.ts.
 *
 * Mounted at the layout level so the bubble is available on every page,
 * not just the homepage. Listens for a custom "open-ask-rishi" event
 * so anchor links elsewhere on the site can trigger the panel open.
 */

type Source = { slug: string; title: string };
type Message = {
  role: "user" | "rishi";
  content: string;
  sources?: Source[];
};

const QUICK_REPLIES: string[] = [
  "What would you build in your first 90 days?",
  "How do you scope an AI pilot?",
  "Where doesn't AI help?",
  "Why BI before AI?",
];

const PROJECT_SLUGS = new Set([
  "early-warning",
  "wbr-copilot",
  "data-dictionary",
  "sas-agent",
  "escape-room",
  "liquor-store",
  "paysplitt",
]);

const TEASER_DISMISS_KEY = "ask-rishi-teaser-dismissed";

export function AskRishi() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // External anchors (#ask, hero CTA) can dispatch this event to open
  // the chat panel without coupling components.
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      dismissTeaser();
    };
    window.addEventListener("open-ask-rishi", handler);
    return () => window.removeEventListener("open-ask-rishi", handler);
  }, []);

  // First-visit teaser. Shows ~2.5s after page load if the user has
  // never dismissed it. Persists across pages within the same visit
  // (until dismissed) via localStorage.
  useEffect(() => {
    try {
      if (localStorage.getItem(TEASER_DISMISS_KEY) === "1") return;
    } catch {
      // localStorage blocked — fall through, show the teaser once per session
    }
    const t = setTimeout(() => setShowTeaser(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function dismissTeaser() {
    setShowTeaser(false);
    try {
      localStorage.setItem(TEASER_DISMISS_KEY, "1");
    } catch {}
  }

  function togglePill() {
    setOpen((o) => !o);
    dismissTeaser();
  }

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 4 || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something broke. Try again in a moment.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "rishi",
          content: data.answer,
          sources: data.sources ?? [],
        },
      ]);
    } catch {
      setError("Couldn't reach the model. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* First-visit teaser. Slides up next to the chat pill, explicitly
          calls out that this is something Rishi built. Dismisses on
          click of itself, the chat pill, or the X. Persists dismissal
          in localStorage so it never reappears for that user. */}
      {showTeaser && !open && (
        <div
          role="status"
          aria-live="polite"
          className="chat-teaser fixed bottom-24 right-6 z-50 w-[280px] rounded-md border border-border bg-card p-3 shadow-2xl"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissTeaser}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <CloseIcon small />
          </button>
          <div className="flex items-start gap-2.5 pr-5">
            <Image
              src="/headshot.JPG"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
            <div className="space-y-1">
              <div className="text-[0.7rem] uppercase tracking-[0.14em] text-accent">
                I built this · AI tool
              </div>
              <p className="text-sm leading-snug text-foreground/90">
                Chat with the version of me trained on this site.
                Ask anything.
              </p>
            </div>
          </div>
          {/* Pointer */}
          <div
            aria-hidden
            className="absolute -bottom-1.5 right-10 h-3 w-3 rotate-45 border-b border-r border-border bg-card"
          />
        </div>
      )}

      {/* Floating chat pill — text + icon for unmissable affordance.
          Pulsing ring underneath draws the eye briefly. Both effects
          stop the moment the panel opens. */}
      <button
        type="button"
        aria-label={open ? "Close chat with Rishi" : "Open chat with Rishi"}
        aria-expanded={open}
        onClick={togglePill}
        className={`group fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] ${
          open ? "h-14 w-14 justify-center" : "chat-pulse h-14 pl-4 pr-5"
        }`}
      >
        {open ? (
          <CloseIcon />
        ) : (
          <>
            <span className="inline-flex h-7 w-7 items-center justify-center">
              <ChatIcon />
            </span>
            <span className="text-sm font-semibold">Chat with me</span>
            <span
              aria-hidden
              className="text-base transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Rishi"
          className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-[400px] flex-col overflow-hidden rounded-md border border-border bg-card shadow-2xl md:bottom-24 md:right-6"
          style={{ maxHeight: "min(640px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <Image
              src="/headshot.JPG"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Rishi</div>
              <div className="inline-flex items-center gap-1.5 text-[0.7rem] tracking-wide text-muted-foreground">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                />
                <span>Trained on this site</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <CloseIcon small />
            </button>
          </header>

          {/* Message area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-background px-4 py-4"
          >
            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              <ul className="space-y-4">
                {messages.map((m, i) => (
                  <li key={i}>
                    {m.role === "user" ? (
                      <UserBubble content={m.content} />
                    ) : (
                      <RishiBubble content={m.content} sources={m.sources ?? []} />
                    )}
                  </li>
                ))}
                {loading && (
                  <li>
                    <TypingIndicator />
                  </li>
                )}
                {error && (
                  <li>
                    <ErrorMessage message={error} />
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Quick reply chips — always visible above input */}
          {messages.length > 0 && messages.length < 4 && !loading && (
            <div className="border-t border-border bg-card px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground/75 transition-colors hover:border-accent hover:text-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-border bg-card px-3 py-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a question..."
              rows={1}
              disabled={loading}
              className="max-h-24 min-h-[36px] flex-1 resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length < 4}
              aria-label="Send"
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-foreground/85">
          Hi. This is a version of me grounded on every page on this site:
          the case study, the project walkthroughs, my résumé, and a voice
          file. Ask anything about how I work or what I&apos;ve shipped.
        </p>
      </div>
      <div className="space-y-2">
        <div className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
          Try one
        </div>
        <div className="flex flex-col gap-1.5">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="rounded-sm border border-border bg-card px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:border-accent hover:text-accent"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-md rounded-br-sm bg-secondary px-3 py-2 text-sm leading-relaxed text-foreground">
        {content}
      </div>
    </div>
  );
}

function RishiBubble({
  content,
  sources,
}: {
  content: string;
  sources: Source[];
}) {
  return (
    <div className="flex items-start gap-2">
      <Image
        src="/headshot.JPG"
        alt=""
        width={28}
        height={28}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
      />
      <div className="flex-1 space-y-2">
        <div className="rounded-md rounded-tl-sm border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground/90">
          {content.split(/\n\n+/).map((p, i) => (
            <p key={i} className={i > 0 ? "mt-2" : undefined}>
              {p}
            </p>
          ))}
        </div>
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <SourceChip key={s.slug} slug={s.slug} title={s.title} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceChip({ slug, title }: { slug: string; title: string }) {
  if (PROJECT_SLUGS.has(slug)) {
    return (
      <Link
        href={`/projects/${slug}`}
        className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 text-[0.7rem] text-foreground/80 transition-colors hover:border-accent hover:text-accent"
      >
        {title}
        <span aria-hidden>→</span>
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-background px-2 py-0.5 text-[0.7rem] text-foreground/70">
      {title}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <Image
        src="/headshot.JPG"
        alt=""
        width={28}
        height={28}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
      />
      <div className="inline-flex items-center gap-1 rounded-md rounded-tl-sm border border-border bg-card px-3 py-3">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
        />
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: "150ms" }}
        />
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-foreground/80">
      {message}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon({ small = false }: { small?: boolean }) {
  const size = small ? 16 : 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
