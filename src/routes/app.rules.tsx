import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "../components/common/PageHeader";
import {
  ACTION_LABEL,
  DOC_TYPES,
  OPERATORS,
  RULE_SEED as SEED,
  type ActionKind,
  type Rule,
  type Version,
} from "../lib/rules";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/rules")({ component: RulesConsole });

/* ─────────────────────────  Local types  ───────────────────────── */

type DocData = { versions: Version[]; draft: Rule[] };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function seedState(): Record<string, DocData> {
  const out: Record<string, DocData> = {};
  for (const key of Object.keys(SEED)) {
    const versions = clone(SEED[key].versions);
    const last = versions[versions.length - 1];
    out[key] = { versions, draft: clone(last.rules) };
  }
  return out;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ─────────────────────────  Page  ───────────────────────── */

let ruleSeq = 100;

function RulesConsole() {
  const [data, setData] = useState<Record<string, DocData>>(seedState);
  const [activeType, setActiveType] = useState("financial");
  const [activeVersion, setActiveVersion] = useState<"draft" | number>("draft");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Omit<Rule, "id">>({ name: "", field: "", operator: OPERATORS[0], value: "", action: "flag" });
  const [addOpen, setAddOpen] = useState(false);
  const [draftRule, setDraftRule] = useState<Omit<Rule, "id">>({ name: "", field: "", operator: OPERATORS[0], value: "", action: "decline" });

  const doc = data[activeType];
  const isReadonly = activeVersion !== "draft";
  const rules = useMemo(() => {
    if (activeVersion === "draft") return doc.draft;
    return doc.versions.find((v) => v.version === activeVersion)?.rules ?? [];
  }, [doc, activeVersion]);

  const switchType = (key: string) => {
    setActiveType(key);
    setActiveVersion("draft");
    setEditingId(null);
    setAddOpen(false);
  };

  const setDraft = (updater: (d: Rule[]) => Rule[]) =>
    setData((prev) => ({ ...prev, [activeType]: { ...prev[activeType], draft: updater(prev[activeType].draft) } }));

  const startEdit = (r: Rule) => {
    setEditingId(r.id);
    setEdit({ name: r.name, field: r.field, operator: r.operator, value: r.value, action: r.action });
  };

  const saveEdit = (id: string) => {
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, ...edit } : r)));
    setEditingId(null);
  };

  const deleteRule = (id: string) => {
    if (!window.confirm("Delete this rule from the draft? This will only take effect once you publish a new version.")) return;
    setDraft((d) => d.filter((r) => r.id !== id));
  };

  const saveNewRule = () => {
    if (!draftRule.name.trim() || !draftRule.field.trim() || !draftRule.value.trim()) {
      toast.error("Rule name, field, and value are required.");
      return;
    }
    setDraft((d) => [...d, { id: `r${ruleSeq++}`, ...draftRule, name: draftRule.name.trim(), field: draftRule.field.trim(), value: draftRule.value.trim() }]);
    setDraftRule({ name: "", field: "", operator: OPERATORS[0], value: "", action: "decline" });
    setAddOpen(false);
  };

  const publish = () => {
    setData((prev) => {
      const d = prev[activeType];
      const nextVersion = d.versions[d.versions.length - 1].version + 1;
      return {
        ...prev,
        [activeType]: { ...d, versions: [...d.versions, { version: nextVersion, publishedAt: todayLabel(), rules: clone(d.draft) }] },
      };
    });
    const nextVersion = doc.versions[doc.versions.length - 1].version + 1;
    toast.success(`Published v${nextVersion}. Historical triage decisions keep showing which version they used.`);
  };

  const restore = () => {
    const v = doc.versions.find((x) => x.version === activeVersion);
    if (!v) return;
    setDraft(() => clone(v.rules));
    setActiveVersion("draft");
    toast.success(`v${v.version} copied into the draft. Publish to make it live again.`);
  };

  const typeLabel = DOC_TYPES.find((d) => d.key === activeType)!.label;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appetite rules console"
        description="Hard rules run before the AI narrative layer. Edits here never touch code — publish a new version when ready."
        actions={
          <>
            <ConsoleButton tone="primary" disabled={isReadonly} onClick={() => setAddOpen((o) => !o)}>
              <Plus className="h-3.5 w-3.5" /> Add new rule
            </ConsoleButton>
            <ConsoleButton tone="good" disabled={isReadonly} onClick={publish}>
              <Upload className="h-3.5 w-3.5" /> Publish new version
            </ConsoleButton>
          </>
        }
      />

      {/* Document-type tabs */}
      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map((d) => (
          <button
            key={d.key}
            onClick={() => switchType(d.key)}
            className={cn(
              "rounded-full border px-4 py-2 font-mono text-xs transition",
              d.key === activeType
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Version selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-muted-foreground">Viewing</span>
          <select
            value={String(activeVersion)}
            onChange={(e) => {
              setActiveVersion(e.target.value === "draft" ? "draft" : parseInt(e.target.value, 10));
              setEditingId(null);
            }}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="draft">Draft (unpublished)</option>
            {doc.versions
              .slice()
              .reverse()
              .map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} — published {v.publishedAt}
                </option>
              ))}
          </select>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {doc.versions.length} published version{doc.versions.length === 1 ? "" : "s"} for {typeLabel.toLowerCase()}
        </span>
      </div>

      {/* Read-only banner */}
      {isReadonly && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 font-mono text-xs text-amber-500">
          <span>Viewing v{activeVersion} (read-only) — this is not the live draft.</span>
          <ConsoleButton tone="plain" onClick={restore}>
            Restore this version to draft
          </ConsoleButton>
        </div>
      )}

      {/* Rules table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-4 py-2.5 font-medium">Rule name</th>
              <th className="border-b border-border px-4 py-2.5 font-medium">Field</th>
              <th className="border-b border-border px-4 py-2.5 font-medium">Operator</th>
              <th className="border-b border-border px-4 py-2.5 font-medium">Value</th>
              <th className="border-b border-border px-4 py-2.5 font-medium">Action</th>
              <th className="border-b border-border px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) =>
              editingId === r.id ? (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5"><EditInput value={edit.name} onChange={(v) => setEdit((e) => ({ ...e, name: v }))} /></td>
                  <td className="px-4 py-2.5"><EditInput value={edit.field} onChange={(v) => setEdit((e) => ({ ...e, field: v }))} /></td>
                  <td className="px-4 py-2.5">
                    <EditSelect value={edit.operator} options={OPERATORS} onChange={(v) => setEdit((e) => ({ ...e, operator: v }))} />
                  </td>
                  <td className="px-4 py-2.5"><EditInput value={edit.value} onChange={(v) => setEdit((e) => ({ ...e, value: v }))} /></td>
                  <td className="px-4 py-2.5">
                    <EditSelect
                      value={edit.action}
                      options={Object.keys(ACTION_LABEL)}
                      labels={ACTION_LABEL}
                      onChange={(v) => setEdit((e) => ({ ...e, action: v as ActionKind }))}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <ConsoleButton tone="primary" small onClick={() => saveEdit(r.id)}>Save</ConsoleButton>
                      <ConsoleButton tone="plain" small onClick={() => setEditingId(null)}>Cancel</ConsoleButton>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2/40">
                  <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.field}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.operator}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.value}</td>
                  <td className="px-4 py-3"><ActionBadge action={r.action} /></td>
                  <td className="px-4 py-3">
                    {!isReadonly && (
                      <div className="flex gap-1.5">
                        <ConsoleButton tone="plain" small onClick={() => startEdit(r)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </ConsoleButton>
                        <ConsoleButton tone="danger" small onClick={() => deleteRule(r.id)}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </ConsoleButton>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No rules in this ruleset yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add rule form */}
      {addOpen && !isReadonly && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <EditInput placeholder="Rule name" value={draftRule.name} onChange={(v) => setDraftRule((d) => ({ ...d, name: v }))} />
            <EditInput placeholder="Field (e.g. class_code)" value={draftRule.field} onChange={(v) => setDraftRule((d) => ({ ...d, field: v }))} />
            <EditSelect value={draftRule.operator} options={OPERATORS} onChange={(v) => setDraftRule((d) => ({ ...d, operator: v }))} />
            <EditInput placeholder="Value" value={draftRule.value} onChange={(v) => setDraftRule((d) => ({ ...d, value: v }))} />
            <EditSelect
              value={draftRule.action}
              options={Object.keys(ACTION_LABEL)}
              labels={ACTION_LABEL}
              onChange={(v) => setDraftRule((d) => ({ ...d, action: v as ActionKind }))}
            />
          </div>
          <div className="flex gap-2">
            <ConsoleButton tone="primary" onClick={saveNewRule}>Save rule</ConsoleButton>
            <ConsoleButton tone="plain" onClick={() => setAddOpen(false)}>Cancel</ConsoleButton>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Pieces  ───────────────────────── */

function ActionBadge({ action }: { action: ActionKind }) {
  const cls =
    action === "decline"
      ? "bg-destructive/12 text-destructive"
      : action === "flag"
        ? "bg-amber-500/12 text-amber-500"
        : "bg-primary/12 text-primary";
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-1 font-mono text-[11px]", cls)}>
      {ACTION_LABEL[action]}
    </span>
  );
}

function ConsoleButton({
  children,
  onClick,
  disabled,
  tone = "plain",
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "plain" | "primary" | "good" | "danger";
  small?: boolean;
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-500/40 text-emerald-500 hover:border-emerald-500"
      : tone === "danger"
        ? "border-destructive/40 text-destructive hover:border-destructive"
        : tone === "primary"
          ? "border-primary/40 text-primary hover:border-primary"
          : "border-border text-foreground hover:border-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-transparent font-mono transition disabled:cursor-not-allowed disabled:opacity-40",
        small ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
        toneCls,
      )}
    >
      {children}
    </button>
  );
}

function EditInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
    />
  );
}

function EditSelect({
  value,
  options,
  labels,
  onChange,
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels ? labels[o] : o}
        </option>
      ))}
    </select>
  );
}
