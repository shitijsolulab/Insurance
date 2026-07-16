import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "../components/common/PageHeader";
import { useSession } from "../lib/session";
import {
  excludedClassCodes,
  publishedVersions,
  type Version,
} from "../lib/rules";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/approvals")({ component: Submissions });

/* ─────────────────────────  Data  ───────────────────────── */

type Rec = "proceed" | "info" | "decline";
type Sev = "required" | "recommended";
type Missing = { sev: Sev; text: string };

type Submission = {
  id: string;
  name: string;
  cls: string;
  /** Present when the recommendation depends on the ACORD appetite ruleset. */
  classCode?: string;
  rec: Rec; // baseline recommendation (when no hard-rule decline applies)
  conf: string;
  flags: number;
  received: string;
  needsClassification: boolean;
  classDoc?: { file: string; guess: string; guessConf: string };
  revenue: string;
  lossHistory: string;
  narrative: string;
  /** Used instead of `narrative` when the class code IS excluded by the active version. */
  declineTemplate?: string;
  /** Used instead of `narrative` when the class code is NOT excluded. */
  baseTemplate?: string;
  missing: Missing[];
};

const REC_META: Record<Rec, { label: string; cls: string }> = {
  proceed: { label: "Proceed", cls: "bg-emerald-500/12 text-emerald-500 border-emerald-500/30" },
  info: { label: "Request info", cls: "bg-amber-500/12 text-amber-500 border-amber-500/30" },
  decline: { label: "Decline", cls: "bg-destructive/12 text-destructive border-destructive/30" },
};

const SEED: Submission[] = [
  {
    id: "s1",
    name: "Acme Roofing Co",
    cls: "GL — Contractors",
    rec: "proceed",
    conf: "92%",
    flags: 0,
    received: "2h ago",
    needsClassification: false,
    revenue: "$1,850,000",
    lossHistory: "5 years provided (meets requirement)",
    narrative:
      "Revenue on the application matches the financial statement within 1% [financials]. Full 5-year loss history provided with a declining loss trend [loss run]. No inconsistencies found.",
    missing: [],
  },
  {
    id: "s2",
    name: "Meridian Textiles",
    cls: "GL — Contractors",
    rec: "info",
    conf: "74%",
    flags: 2,
    received: "5h ago",
    needsClassification: false,
    revenue: "$4,200,000",
    lossHistory: "2020–2022 (5 years required)",
    narrative:
      "Revenue on the application matches the financial statement within 2% [financials]. Loss run covers only 2020–2022 against a 5-year requirement [loss run]. No prior losses were disclosed on the application despite one open claim in the loss run [app, loss run].",
    missing: [
      { sev: "required", text: "Loss run covers 2020–2022; 5 years required" },
      { sev: "recommended", text: "Prior-loss disclosure conflicts with loss run — confirm with broker" },
    ],
  },
  {
    id: "s3",
    name: "Solaris Freight",
    cls: "GL — Trucking",
    classCode: "4581",
    rec: "info",
    conf: "88%",
    flags: 1,
    received: "1d ago",
    needsClassification: true,
    classDoc: { file: "scan_0417.pdf", guess: "Loss run", guessConf: "62%" },
    revenue: "$2,900,000",
    lossHistory: "Pending — awaiting classification confirmation",
    narrative: "",
    declineTemplate:
      "Class code 4581 (long-haul trucking) is on the excluded list for this appetite [appetite rules v{v}]. Recommendation reflects a hard-rule decline and does not require narrative judgment.",
    baseTemplate:
      "Class code 4581 is not on the excluded list under appetite rules v{v}, so no hard-rule decline applies [appetite rules v{v}]. Standard triage continues; scan_0417.pdf must be classified before extraction can be trusted [document intake].",
    missing: [
      { sev: "required", text: "scan_0417.pdf needs classification confirmed before extraction can be trusted" },
    ],
  },
  {
    id: "s4",
    name: "Harbor View Realty",
    cls: "Property",
    rec: "proceed",
    conf: "81%",
    flags: 1,
    received: "1d ago",
    needsClassification: false,
    revenue: "$3,100,000",
    lossHistory: "5 years provided, 1 open claim",
    narrative:
      "Revenue matches financials within 4% [financials]. One open claim from 2024 is still active but within normal range for this class [loss run].",
    missing: [{ sev: "recommended", text: "Confirm current reserve amount on the open 2024 claim" }],
  },
];

// Resolve a submission's recommendation against the selected appetite version.
function resolve(s: Submission, version: Version | undefined): { rec: Rec; conf: string; flags: number; narrative: string; hardDecline: boolean } {
  if (s.classCode) {
    const excluded = excludedClassCodes(version);
    const v = version?.version ?? 0;
    if (excluded.includes(s.classCode)) {
      return { rec: "decline", conf: s.conf, flags: 1, narrative: (s.declineTemplate ?? "").replace(/\{v\}/g, String(v)), hardDecline: true };
    }
    return { rec: s.rec, conf: s.conf, flags: s.flags, narrative: (s.baseTemplate ?? s.narrative).replace(/\{v\}/g, String(v)), hardDecline: false };
  }
  return { rec: s.rec, conf: s.conf, flags: s.flags, narrative: s.narrative, hardDecline: false };
}

/* ─────────────────────────  Page  ───────────────────────── */

function Submissions() {
  const { isManager } = useSession();
  const [subs, setSubs] = useState(SEED);
  const [selectedId, setSelectedId] = useState(SEED[0].id);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Needs classification">("All");

  const acordVersions = publishedVersions("acord");
  const [acordVer, setAcordVer] = useState(acordVersions[acordVersions.length - 1].version);
  const activeVersion = useMemo(() => acordVersions.find((v) => v.version === acordVer), [acordVer]);

  const visible = subs.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "All" || s.needsClassification),
  );
  const selected = subs.find((s) => s.id === selectedId) ?? null;

  const confirmClassification = (id: string) => {
    setSubs((cur) =>
      cur.map((s) =>
        s.id === id
          ? { ...s, needsClassification: false, lossHistory: "5 years provided (meets requirement)" }
          : s,
      ),
    );
    toast.success("Document type confirmed. Extraction and rules validation resumed.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        description="Recommendation, confidence, and flags — before you open one. Triaged against your published appetite rules."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              Appetite rules · ACORD
            </span>
            <select
              value={acordVer}
              onChange={(e) => setAcordVer(parseInt(e.target.value, 10))}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
            >
              {acordVersions
                .slice()
                .reverse()
                .map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version} — published {v.publishedAt}
                  </option>
                ))}
            </select>
          </div>
        }
      />

      <div className="flex flex-col overflow-hidden rounded-2xl border border-border lg:h-[calc(100vh-210px)] lg:flex-row">
        {/* List pane */}
        <aside className="shrink-0 border-b border-border lg:w-[360px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex gap-2 border-b border-border p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search named insured"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
            >
              <option value="All">All</option>
              <option value="Needs classification">Needs classification</option>
            </select>
          </div>

          {visible.map((s) => {
            const r = resolve(s, activeVersion);
            const meta = REC_META[r.rec];
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "flex w-full flex-col gap-1.5 border-b border-border px-4 py-3.5 text-left transition hover:bg-surface",
                  s.id === selectedId && "border-l-2 border-l-primary bg-surface-2",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <Badge className={meta.cls}>{meta.label}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.cls}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {r.conf} confidence · {r.flags} flags
                  </span>
                  {s.needsClassification ? (
                    <Badge className="bg-amber-500/12 text-amber-500 border-amber-500/30">Needs classification</Badge>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">{s.received}</span>
                  )}
                </div>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No matching submissions.</div>
          )}
        </aside>

        {/* Detail pane */}
        <section className="flex-1 p-5 md:p-6 lg:overflow-y-auto">
          {selected ? (
            <Detail
              key={selected.id}
              s={selected}
              resolved={resolve(selected, activeVersion)}
              canDecide={isManager}
              onConfirmClass={() => confirmClassification(selected.id)}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Select a submission from the list.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────  Detail  ───────────────────────── */

function Detail({
  s,
  resolved,
  canDecide,
  onConfirmClass,
}: {
  s: Submission;
  resolved: ReturnType<typeof resolve>;
  canDecide: boolean;
  onConfirmClass: () => void;
}) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const meta = REC_META[resolved.rec];
  const locked = s.needsClassification;

  return (
    <div className="space-y-4">
      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{s.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.cls} · Submitted {s.received}
          </p>
        </div>
        <Badge className={cn(meta.cls, "px-3 py-1 text-xs")}>
          {meta.label} · {resolved.conf}
        </Badge>
      </div>

      {/* Classification banner */}
      {s.needsClassification && s.classDoc && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4">
          <div className="text-sm text-amber-500">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-wide">Needs classification</div>
            {s.classDoc.file} — system guess: {s.classDoc.guess} ({s.classDoc.guessConf}). Extraction and
            rules validation are on hold until this is confirmed.
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary">
              <option>Loss run</option>
              <option>ACORD application</option>
              <option>Financial statement</option>
              <option>Other</option>
            </select>
            <ConsoleButton tone="warn" onClick={onConfirmClass}>Confirm type</ConsoleButton>
          </div>
        </div>
      )}

      {/* Extracted data + source */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card label="Extracted data">
          <Field label="Named insured" defaultValue={s.name} />
          <Field label="Stated annual revenue" defaultValue={s.revenue} />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Loss history provided</div>
            <div className={cn("text-sm", locked ? "text-destructive" : "text-foreground/90")}>
              {s.lossHistory}
            </div>
          </div>
        </Card>
        <Card label="Source document">
          <div className="grid h-24 place-items-center rounded-lg border border-border bg-surface-2 font-mono text-xs text-muted-foreground">
            {s.classDoc ? s.classDoc.file : "loss_run.pdf"}
          </div>
          <button
            onClick={() => toast.info("Opening the source document viewer.")}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground transition hover:border-muted-foreground hover:text-foreground"
          >
            View full document <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Card>
      </div>

      {/* Risk narrative */}
      <Card label="Risk narrative">
        <Narrative text={resolved.narrative} />
      </Card>

      {/* Missing info */}
      {s.missing.length > 0 && (
        <Card label="Missing info">
          <div className="space-y-2.5">
            {s.missing.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]",
                    m.sev === "required" ? "bg-destructive/12 text-destructive" : "bg-amber-500/12 text-amber-500",
                  )}
                >
                  {m.sev === "required" ? "Required" : "Recommended"}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      {canDecide ? (
        <>
          <div className="flex flex-wrap gap-2.5">
            <ConsoleButton tone="good" disabled={locked} onClick={() => toast.success("Recommendation approved as-is. Logged for eval.")}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </ConsoleButton>
            <ConsoleButton disabled={locked} onClick={() => setReasonOpen((o) => !o)}>Override</ConsoleButton>
            <ConsoleButton disabled={locked} onClick={() => toast.info("Extracted fields are editable inline; edits are logged.")}>Edit fields</ConsoleButton>
            <ConsoleButton tone="primary" onClick={() => toast.info("Draft request-info email opened. Not sent automatically.")}>
              Draft request-info email
            </ConsoleButton>
          </div>
          {reasonOpen && (
            <div className="flex flex-wrap items-center gap-2">
              <select className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary">
                <option>Reason: extraction looks wrong</option>
                <option>Reason: rule too strict</option>
                <option>Reason: broker context</option>
              </select>
              <ConsoleButton onClick={() => { toast.success("Override logged with reason."); setReasonOpen(false); }}>
                Confirm override
              </ConsoleButton>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          You can review triage results, but only owners/admins may approve or override recommendations.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────  Pieces  ───────────────────────── */

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block rounded-full border px-2 py-0.5 font-mono text-[11px]", className)}>
      {children}
    </span>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <input
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}

function Narrative({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <sup key={key++} className="ml-0.5 align-super text-[10px] font-medium text-primary">
        [{m[1]}]
      </sup>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <p className="text-sm leading-relaxed text-foreground/90">{nodes}</p>;
}

function ConsoleButton({
  children,
  onClick,
  disabled,
  tone = "plain",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "plain" | "primary" | "good" | "warn";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-500/40 text-emerald-500 hover:border-emerald-500"
      : tone === "warn"
        ? "border-amber-500/40 text-amber-500 hover:border-amber-500"
        : tone === "primary"
          ? "border-primary/40 text-primary hover:border-primary"
          : "border-border text-foreground hover:border-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-transparent px-3.5 py-2 font-mono text-xs transition disabled:cursor-not-allowed disabled:opacity-40",
        toneCls,
      )}
    >
      {children}
    </button>
  );
}
