import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileCheck2,
  FileSearch,
  Landmark,
  Receipt,
  Scale,
  ScrollText,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/knowledge")({ component: Knowledge });

/* ─────────────────────────  Knowledge base (dummy data)  ───────────────────────── */

type Category =
  | "Underwriting"
  | "Claims"
  | "Compliance & KYC"
  | "Customer & Broker";

const CATEGORIES: Category[] = [
  "Underwriting",
  "Claims",
  "Compliance & KYC",
  "Customer & Broker",
];

type Section = { heading: string; body: string; bullets?: string[] };

type Article = {
  id: string;
  title: string;
  category: Category;
  icon: LucideIcon;
  excerpt: string;
  readMin: number;
  updated: string;
  tags: string[];
  sections: Section[];
};

const ARTICLES: Article[] = [
  {
    id: "claims-processing-sop",
    title: "Claims processing SOP, end to end",
    category: "Claims",
    icon: FileCheck2,
    excerpt:
      "The standard sequence for turning an inbound claim into a validated, adjudicated, and settled case — and what to do when a claim needs review.",
    readMin: 5,
    updated: "Jul 08, 2026",
    tags: ["claims", "settlement", "SOP"],
    sections: [
      {
        heading: "How a claim arrives",
        body: "Claimants and brokers submit claim forms as PDFs or attachments. Eagle Doc extracts the header and line items — claimant, policy number, claim number, incident date, and loss amount — into structured data the copilot can validate.",
      },
      {
        heading: "What the copilot checks",
        body: "For each claim the copilot verifies coverage, amounts, and eligibility against the policy, then flags anything outside tolerance.",
        bullets: [
          "Claim links to an active policy on the incident date",
          "Loss amount is within the coverage limit and sum insured",
          "Deductible is applied correctly to the payable amount",
          "No duplicate claim number for the policyholder",
          "Supporting documents (medical report, invoices) are attached",
        ],
      },
      {
        heading: "When a claim needs review",
        body: "Mismatches are grouped as exceptions with a plain-language reason. Common cases: a lapsed policy, a loss above the coverage limit, or a missing loss assessment. Resolve by confirming with the adjuster or claimant, then re-run adjudication.",
      },
    ],
  },
  {
    id: "underwriting-guidelines",
    title: "Underwriting guidelines & risk scoring",
    category: "Underwriting",
    icon: Scale,
    excerpt:
      "The standard sequence for turning an inbound policy application into a validated, risk-scored, and approved policy.",
    readMin: 6,
    updated: "Jul 01, 2026",
    tags: ["underwriting", "risk-score", "checklist"],
    sections: [
      {
        heading: "How an application arrives",
        body: "Brokers and customers email the policy application as a PDF or attachment. Eagle Doc extracts the header and fields — applicant, policy type, sum insured, coverage, and medical or financial disclosures — into structured data the copilot can validate.",
      },
      {
        heading: "The core checklist",
        body: "Work the steps in order — each depends on the one before it.",
        bullets: [
          "Extract application fields with Eagle Doc",
          "Verify the applicant against the customer master",
          "Run KYC and screen for prior claims history",
          "Generate an AI risk score from the disclosures",
          "Route to an underwriter for approval",
          "Create the policy in the connected system",
        ],
      },
      {
        heading: "Where the policy is created",
        body: "The connector-decision layer writes the approved policy to the Policy Admin System when a core system is connected; if none is connected, it appends the policy to the configured Google Sheet so nothing is lost.",
      },
      {
        heading: "Tracking what's outstanding",
        body: "The copilot reports blockers in real time — an unknown applicant, an out-of-appetite risk, or an unsigned approval — so nothing posts to the core system before it's cleared.",
      },
    ],
  },
  {
    id: "fraud-detection-playbook",
    title: "Fraud detection playbook",
    category: "Claims",
    icon: FileSearch,
    excerpt:
      "How suspicious claims are detected, classified by risk and severity, and driven to an investigation decision.",
    readMin: 4,
    updated: "Jul 02, 2026",
    tags: ["fraud", "investigation", "claims"],
    sections: [
      {
        heading: "Detection",
        body: "The copilot watches claim signals for signs of trouble — a claim filed soon after inception, inconsistent incident dates, or repeated claims from the same claimant — and opens an alert the moment one appears.",
      },
      {
        heading: "Classify and act",
        body: "Each alert is classified by risk and severity and paired with a corrective action so the claims team knows exactly what to do.",
        bullets: [
          "Low risk: proceed with standard adjudication",
          "Medium risk: request additional documents from the claimant",
          "High risk: refer to a special investigation unit",
        ],
      },
      {
        heading: "Keep everyone informed",
        body: "The adjuster is kept informed at each step, and the decision is written back to the connected Policy Admin System — or to the configured Google Sheet if none is connected — so the claim record stays accurate.",
      },
    ],
  },
  {
    id: "kyc-aml-checks",
    title: "KYC / AML checks for onboarding",
    category: "Compliance & KYC",
    icon: Landmark,
    excerpt:
      "The documentation and checks required before a new policyholder can be transacted with.",
    readMin: 4,
    updated: "Jul 05, 2026",
    tags: ["kyc", "aml", "compliance"],
    sections: [
      {
        heading: "Collect identity documents",
        body: "New policyholders submit their details through a secure form — legal name, date of birth, KYC document, and supporting proofs — which lands as structured data for the copilot to validate.",
      },
      {
        heading: "Validate and screen",
        body: "The copilot validates the submitted documents and runs the required checks before a record is created.",
        bullets: [
          "Verify identity documents and registration numbers",
          "Confirm banking details are complete and consistent",
          "Run a duplicate-customer check against the master",
          "Screen against sanctions and PEP watchlists",
          "Score customer risk with an AI assessment",
        ],
      },
      {
        heading: "Create the customer record",
        body: "Once checks pass, the copilot drafts the customer record and writes it to the connected Policy Admin System — or to the configured Google Sheet if none is connected — for a final human approval before the customer becomes active.",
      },
    ],
  },
  {
    id: "policy-lifecycle",
    title: "Policy lifecycle & renewals",
    category: "Customer & Broker",
    icon: ScrollText,
    excerpt:
      "How a policy is issued, serviced, and renewed, and how lapses and renewal offers are surfaced to customers and brokers.",
    readMin: 5,
    updated: "Jun 24, 2026",
    tags: ["policy", "renewal", "broker"],
    sections: [
      {
        heading: "Retrieve policy data",
        body: "The copilot pulls the latest status, coverage, and premium events from the Policy Admin System for each active policy, then reconciles them against the customer record and renewal calendar.",
      },
      {
        heading: "Predict the renewal",
        body: "Using coverage, claims history, and premium performance, the copilot predicts a renewal offer and compares it to the expiry date.",
        bullets: [
          "Detect upcoming expiries and lapses against the plan",
          "Run risk analysis for repricing and coverage changes",
          "Recompute the renewal offer as new events arrive",
        ],
      },
      {
        heading: "Notify and escalate",
        body: "When a policy nears expiry or a lapse is detected, the copilot notifies the customer and the broker with the renewal offer and the reason, so the right people can act before the policy lapses.",
      },
    ],
  },
  {
    id: "premium-reconciliation",
    title: "Premium reconciliation: how payments are matched",
    category: "Compliance & KYC",
    icon: Receipt,
    excerpt:
      "How a premium payment is matched to its policy and premium invoice before it's cleared — and what to do when an amount doesn't match.",
    readMin: 4,
    updated: "Jun 30, 2026",
    tags: ["premium", "reconciliation", "finance"],
    sections: [
      {
        heading: "What premium reconciliation is",
        body: "Premium reconciliation compares three records before a premium is posted: the received payment, the policy that the premium is due against, and the premium invoice confirming the amount billed.",
      },
      {
        heading: "What the copilot checks",
        body: "For each payment, the copilot verifies amount, policy number, and billing period against the invoice and the policy, then flags anything outside tolerance.",
        bullets: [
          "Amount paid matches the premium invoice within tolerance",
          "Payment links to an active policy number",
          "Billing period aligns with the coverage term",
          "No duplicate payment for the policy",
          "Taxes and levies are expected for the coverage region",
        ],
      },
      {
        heading: "When an amount doesn't match",
        body: "Mismatches are grouped as exceptions with a plain-language reason. Common cases: a short payment, an overpayment, or a levy change since the invoice was cut. Resolve by confirming with finance or the broker, then re-run the match.",
      },
    ],
  },
];

/* ─────────────────────────  Page  ───────────────────────── */

function Knowledge() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchesCat = category === "all" || a.category === category;
      const matchesQ =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  }, [query, category]);

  const open = openId ? ARTICLES.find((a) => a.id === openId) ?? null : null;

  if (open) {
    const related = ARTICLES.filter((a) => a.category === open.category && a.id !== open.id).slice(0, 3);
    return <ArticleReader article={open} related={related} onBack={() => setOpenId(null)} onOpen={setOpenId} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Knowledge Base
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Insurance knowledge base
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Policies, SOPs, and how-to guides for your underwriting, claims, compliance, and broker workflows.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, policies, and SOPs…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Chip label="All" active={category === "all"} onClick={() => setCategory("all")} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No articles found</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing matches “{query}”.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <ArticleCard key={a.id} article={a} onOpen={() => setOpenId(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ArticleCard({ article, onOpen }: { article: Article; onOpen: () => void }) {
  const Icon = article.icon;
  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {article.category}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-foreground">{article.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{article.excerpt}</p>
      <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {article.readMin} min read
        </span>
        <span>Updated {article.updated}</span>
      </div>
    </button>
  );
}

/* ─────────────────────────  Article reader  ───────────────────────── */

function ArticleReader({
  article,
  related,
  onBack,
  onOpen,
}: {
  article: Article;
  related: Article[];
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const Icon = article.icon;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to knowledge base
      </button>

      {/* Article header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <Icon className="h-3.5 w-3.5" />
          {article.category}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {article.readMin} min read
          </span>
          <span>Updated {article.updated}</span>
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((t) => (
              <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <article className="space-y-6 rounded-2xl border border-border bg-card p-6">
        {article.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-semibold text-foreground">{s.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.body}</p>
            {s.bullets && (
              <ul className="mt-3 space-y-1.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Related in {article.category}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {related.map((r) => {
              const RIcon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className="rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <RIcon className="h-4 w-4 text-primary" />
                  <div className="mt-2 text-sm font-medium leading-snug text-foreground">{r.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{r.readMin} min read</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
