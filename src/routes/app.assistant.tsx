import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  FileSearch,
  FileText,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../api";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

type Msg = { role: "user" | "assistant"; content: string };

// Module-level cache so the conversation survives navigating away from and back
// to the Assistant within a session (the route component unmounts on nav, which
// would otherwise reset local state). Cleared by "New chat".
const chatCache: { messages: Msg[]; sessionId?: string } = { messages: [] };

const SUGGESTED: { icon: LucideIcon; title: string; desc: string; prompt: string }[] = [
  {
    icon: FileSearch,
    title: "Summarize a claim",
    desc: "Get a quick read on your latest claim submission.",
    prompt: "Summarize my most recent claim.",
  },
  {
    icon: Bot,
    title: "Weekly status update",
    desc: "Draft a status from this week's claims & policies.",
    prompt: "Draft a status update from this week's claims and policies.",
  },
  {
    icon: Sparkles,
    title: "Explore the platform",
    desc: "See what the copilots can do for your team.",
    prompt: "What can this platform do for my team?",
  },
  {
    icon: ShieldCheck,
    title: "How approvals work",
    desc: "Understand routing and human sign-off.",
    prompt: "Explain how approvals work here.",
  },
];

/* ─────────────────────────  Dummy responses (prototype)  ───────────────────────── */

// Keyword-matched canned answers so the prototype always responds even without a
// live LLM backend. Uses **bold** and "• " bullets which the renderer styles.
function dummyReply(message: string, useRag: boolean): string {
  const q = message.toLowerCase();
  const cite = useRag ? "\n\n_Sources: policy POL-2214, claim CLM-5521, medical report MR-4459._" : "";

  if (q.includes("summar") && (q.includes("document") || q.includes("recent") || q.includes("claim") || q.includes("policy"))) {
    return (
      "Here's a summary of your most recent claim — **Claim CLM-5521 on Policy POL-2214 (Auto)**:\n\n" +
      "• **Amount:** $14,280.00 across 8 line items (loss date Aug 07, 2026)\n" +
      "• **Policy match:** the claimed items reconcile against the policy coverage and deductible\n" +
      "• **Flag:** a $1,180.00 repair charge exceeds the quoted estimate — worth confirming\n" +
      "• **Status:** awaiting Claims approval before settlement is authorized" +
      cite
    );
  }
  if (q.includes("what can") || q.includes("platform do") || q.includes("for my team")) {
    return (
      "I'm your **insurance copilot**. I can take the busywork off your underwriting, claims, and broker teams:\n\n" +
      "• **Explain policies** — read coverage, exclusions, and terms into plain language\n" +
      "• **Recommend coverage** — suggest the right products and limits for each customer\n" +
      "• **Summarize claims** — turn claim forms and medical reports into clean data via Eagle Doc\n" +
      "• **Detect fraud** — flag suspicious claims and classify by risk and severity\n" +
      "• **Answer customer questions** — respond to policyholders instantly and accurately\n" +
      "• **Generate policy documents** — draft policies, endorsements, and letters\n" +
      "• **Risk analysis & executive reporting** — loss ratios, exposure, and board-ready summaries\n\n" +
      "Everything I do is drafted for review — **nothing is issued or settled without a human approving it.**"
    );
  }
  if (q.includes("status update") || q.includes("this week") || q.includes("draft")) {
    return (
      "**Insurance operations — weekly status**\n\n" +
      "• **Policies:** 12 underwritten today, 5 awaiting approval, 1 duplicate held (POL-2231)\n" +
      "• **Claims:** 128 active, 94.2% approval rate, 3 fraud alerts flagged\n" +
      "• **Portfolio risk:** 17 policies above target concentration\n" +
      "• **Risks:** one claim (CLM-4459) flagged for possible fraud investigation\n\n" +
      "Want me to tailor this for a specific stakeholder?"
    );
  }
  if (q.includes("approval") || q.includes("approve")) {
    return (
      "**How approvals work here:**\n\n" +
      "• A copilot drafts an action (e.g. a policy ready to issue) and pauses\n" +
      "• It routes to the right approver based on type and amount thresholds\n" +
      "• The approver reviews the AI summary + validation checks, then approves or rejects\n" +
      "• Only after sign-off does anything write back to your policy admin system — with a full audit trail" +
      cite
    );
  }
  if (q.includes("fraud") || q.includes("claim") || q.includes("investigat")) {
    return (
      "For **claim CLM-4459** on Policy POL-2214, the submission looks routine but our model flags it " +
      "**medium risk** — the loss was reported 2 days after a coverage change and the repair invoice " +
      "pattern matches 2 prior flagged cases. Shall I draft an investigation action for the SIU team?" + cite
    );
  }
  if (q.includes("hello") || q.includes("hi ") || q.trim() === "hi" || q.includes("hey")) {
    return "Hi! I'm your insurance copilot. Ask me about your policies, claims, approvals, or fraud alerts — or tap a suggestion to start.";
  }
  return (
    "Here's how I'd approach that: I'd pull the relevant documents and policy data, draft a clear " +
    "answer, and flag anything that needs your review before it writes back. Try asking about " +
    "**policies, claims processing, approvals, or fraud detection.**" + cite
  );
}

/* ─────────────────────────  Page  ───────────────────────── */

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>(() => chatCache.messages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const sessionId = useRef<string | undefined>(chatCache.sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Persist the conversation across route navigation within the session.
  useEffect(() => {
    chatCache.messages = messages;
  }, [messages]);

  const appendToLast = (delta: string) =>
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { role: "assistant", content: last.content + delta };
      return copy;
    });

  // Stream a canned answer word-by-word for a realistic typing feel.
  const streamDummy = async (full: string) => {
    const tokens = full.match(/\S+\s*/g) ?? [full];
    for (const t of tokens) {
      await new Promise((r) => setTimeout(r, 22));
      appendToLast(t);
    }
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming) return;
    // Uploaded documents ground the answer (citations shown).
    const useDocs = files.length > 0;
    setInput("");
    setFiles([]);
    setMessages((m) => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      let got = false;
      for await (const chunk of api.chatStream({
        message,
        session_id: sessionId.current,
        use_rag: useDocs,
      })) {
        if (chunk.session_id) {
          sessionId.current = chunk.session_id;
          chatCache.sessionId = chunk.session_id;
        }
        if (chunk.delta) {
          got = true;
          appendToLast(chunk.delta);
        }
      }
      // Backend reachable but returned nothing → fall back to a dummy reply.
      if (!got) await streamDummy(dummyReply(message, useDocs));
    } catch {
      // No backend (prototype) → simulate a response so the demo always works.
      await streamDummy(dummyReply(message, useDocs));
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setFiles([]);
    sessionId.current = undefined;
    chatCache.messages = [];
    chatCache.sessionId = undefined;
  };

  const hasMessages = messages.length > 0;

  const composer = (
    <Composer
      input={input}
      setInput={setInput}
      onSend={send}
      streaming={streaming}
      files={files}
      setFiles={setFiles}
      autoFocus={!hasMessages}
    />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Slim header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          AI Assistant
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Copilot online
          </span>
          {hasMessages && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-primary/50 hover:text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" /> New chat
            </button>
          )}
        </div>
      </div>

      {hasMessages ? (
        <>
          {/* Conversation — a single flowing surface, no boxed card */}
          <div
            ref={scrollRef}
            className="nice-scroll flex-1 overflow-y-auto"
          >
            <div className="flex w-full flex-col gap-5 px-1 py-2">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      m.role === "user"
                        ? "bg-secondary text-secondary-foreground"
                        : "brand-gradient text-primary-foreground shadow-sm shadow-primary/25",
                    )}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm border border-border bg-card text-foreground",
                    )}
                  >
                    {m.content ? (
                      <RichText text={m.content} />
                    ) : streaming ? (
                      <TypingDots />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Composer docked at the bottom, aligned to the conversation width */}
          <div className="mt-2 border-t border-border pt-3">
            <div className="w-full">{composer}</div>
          </div>
        </>
      ) : (
        /* Empty state — centered greeting, prominent input, suggestion chips.
           Fits within the viewport (no scroll before the chat starts). */
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-2 py-2">
          <div className="w-full max-w-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="brand-gradient grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                Workspace Copilot
              </div>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">
                How can I help with your <span className="text-primary">insurance</span> today?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                I reason over your organization's data and draft answers — nothing posts without
                your approval.
              </p>
            </div>

            <div className="mt-5">{composer}</div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {SUGGESTED.slice(0, 3).map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.title}
                    onClick={() => send(s.prompt)}
                    className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[12.5px] font-semibold leading-tight">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Composer  ───────────────────────── */

function Composer({
  input,
  setInput,
  onSend,
  streaming,
  files,
  setFiles,
  autoFocus = false,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: (text: string) => void;
  streaming: boolean;
  files: string[];
  setFiles: (v: string[]) => void;
  autoFocus?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(input);
      }}
    >
      <div className="rounded-2xl border border-border bg-surface shadow-sm transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
        {/* Attached documents */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            {files.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                <FileText className="h-3 w-3" />
                <span className="max-w-[160px] truncate">{f}</span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="text-primary/70 transition hover:text-primary"
                  aria-label={`Remove ${f}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 px-2.5 py-1.5">
          {/* Attach / upload documents */}
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name);
              if (names.length) setFiles([...files, ...names]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach documents"
            aria-label="Attach documents"
            className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            autoFocus={autoFocus}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend(input);
              }
            }}
            rows={1}
            placeholder="Ask about policies, claims, approvals…"
            disabled={streaming}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="brand-gradient mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Attach documents with + · Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}

// Lightweight renderer: **bold**, "• " bullets, and preserved line breaks.
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        const bullet = line.trimStart().startsWith("• ");
        const body = bullet ? line.trimStart().slice(2) : line;
        return (
          <div key={i} className={cn("flex gap-2", bullet && "pl-1")}>
            {bullet && <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />}
            <span className="whitespace-pre-wrap">{renderBold(body)}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderBold(text: string) {
  return text.split(/(\*\*.+?\*\*|_.+?_)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return (
        <em key={i} className="text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
    </span>
  );
}
