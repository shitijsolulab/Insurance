// Shared appetite-rules catalog. Both the Rules console (/app/rules) and the
// Submissions triage queue (/app/approvals) read from this single source of
// truth, so the version an underwriter triages against is the same ruleset the
// admin publishes. In the real product this comes from the rules service.

export type ActionKind = "decline" | "flag" | "require";

export type Rule = {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: string;
  action: ActionKind;
};

export type Version = { version: number; publishedAt: string; rules: Rule[] };

export const OPERATORS = ["equals", "not equals", "greater than", "less than", "contains"];

export const DOC_TYPES: { key: string; label: string }[] = [
  { key: "financial", label: "Financial statements" },
  { key: "acord", label: "ACORD applications" },
  { key: "lossrun", label: "Loss runs" },
];

export const ACTION_LABEL: Record<ActionKind, string> = {
  decline: "Decline",
  flag: "Flag for review",
  require: "Require doc",
};

export const RULE_SEED: Record<string, { versions: Version[] }> = {
  financial: {
    versions: [
      {
        version: 1,
        publishedAt: "May 12, 2026",
        rules: [
          { id: "f1", name: "Minimum revenue", field: "stated_annual_revenue", operator: "less than", value: "$250,000", action: "flag" },
          { id: "f2", name: "Missing financials on large risk", field: "total_revenue", operator: "equals", value: "blank (if revenue > $5M)", action: "require" },
        ],
      },
    ],
  },
  acord: {
    versions: [
      {
        version: 1,
        publishedAt: "Apr 30, 2026",
        rules: [
          { id: "a1", name: "Excluded class codes", field: "class_code", operator: "equals", value: "0106, 3821, 9101", action: "decline" },
          { id: "a2", name: "Prohibited states", field: "state_of_operation", operator: "contains", value: "FL, LA", action: "decline" },
          { id: "a3", name: "Effective date too soon", field: "effective_date", operator: "less than", value: "5 business days out", action: "flag" },
        ],
      },
      {
        version: 2,
        publishedAt: "Jun 2, 2026",
        rules: [
          { id: "a1", name: "Excluded class codes", field: "class_code", operator: "equals", value: "0106, 3821, 9101, 4581", action: "decline" },
          { id: "a2", name: "Prohibited states", field: "state_of_operation", operator: "contains", value: "FL, LA", action: "decline" },
          { id: "a3", name: "Effective date too soon", field: "effective_date", operator: "less than", value: "5 business days out", action: "flag" },
        ],
      },
    ],
  },
  lossrun: {
    versions: [
      {
        version: 1,
        publishedAt: "May 20, 2026",
        rules: [
          { id: "l1", name: "Insufficient loss history", field: "years_of_history_provided", operator: "less than", value: "5 years", action: "flag" },
          { id: "l2", name: "High open claim count", field: "open_claim_count", operator: "greater than", value: "3", action: "flag" },
        ],
      },
    ],
  },
};

/** Published versions for a document type, oldest → newest. */
export function publishedVersions(docKey: string): Version[] {
  return RULE_SEED[docKey]?.versions ?? [];
}

/** The class codes excluded by a given ACORD ruleset version. */
export function excludedClassCodes(version: Version | undefined): string[] {
  if (!version) return [];
  const rule = version.rules.find((r) => r.field === "class_code" && r.action === "decline");
  if (!rule) return [];
  return rule.value.split(",").map((c) => c.trim()).filter(Boolean);
}
