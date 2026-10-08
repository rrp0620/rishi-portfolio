"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "bot"; content: string; handoff?: boolean };

export function DemoChat({
  slug,
  name,
  accent,
  greeting,
  starters,
  handoff,
}: {
  slug: string;
  name: string;
  accent: string;
  greeting: string;
  starters: string[];
  handoff: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadFor, setLeadFor] = useState<number | null>(null);
  const [leadSent, setLeadSent] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, leadFor]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages((m) => [...m, { role: "bot", content: data.answer, handoff: !!data.handoff }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "bot", content: e instanceof Error ? e.message : "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex h-[640px] max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-[#111] shadow-2xl"
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: accent }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="flex items-center gap-1.5 text-xs text-white/85">
            <span className="h-2 w-2 rounded-full bg-green-300" /> Online 24/7, replies instantly
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f6f6f7] px-4 py-4">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed " +
                  (m.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm bg-white shadow-sm")
                }
                style={m.role === "user" ? { background: accent } : undefined}
              >
                {m.content}
              </div>
            </div>
            {m.handoff && !leadSent.has(i) && leadFor !== i && (
              <button
                onClick={() => setLeadFor(i)}
                className="ml-1 mt-2 rounded-full border bg-white px-3 py-1.5 text-sm font-medium shadow-sm"
                style={{ borderColor: accent, color: accent }}
              >
                Have someone get back to me
              </button>
            )}
            {leadFor === i && (
              <LeadForm
                accent={accent}
                onDone={() => {
                  setLeadSent((s) => new Set(s).add(i));
                  setLeadFor(null);
                  setMessages((ms) => [
                    ...ms,
                    {
                      role: "bot",
                      content: `Thanks! I've passed this to ${handoff} with our full conversation, so you won't have to repeat yourself. (Demo: in the live version this lands in their inbox or CRM instantly.)`,
                    },
                  ]);
                }}
              />
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="h-2 w-2 animate-bounce rounded-full bg-black/30"
                  style={{ animationDelay: `${d * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border bg-white px-3 py-1.5 text-left text-sm shadow-sm hover:bg-black/5"
                style={{ borderColor: accent + "55" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-black/10 bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="min-w-0 flex-1 rounded-full border border-black/15 bg-white px-4 py-2.5 text-[16px] text-[#111] outline-none focus:border-black/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function LeadForm({ accent, onDone }: { accent: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && contact.trim()) onDone();
      }}
      className="mt-2 space-y-2 rounded-xl bg-white p-3 shadow-sm"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-[16px]"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Phone or email"
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-[16px]"
      />
      <button
        type="submit"
        className="w-full rounded-lg py-2 text-sm font-semibold text-white"
        style={{ background: accent }}
      >
        Send to the team
      </button>
    </form>
  );
}
