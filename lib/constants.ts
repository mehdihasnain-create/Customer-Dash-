export const FILTERS: Record<string, string> = {
  "AI Bot":              "25251640968348",
  "Messaging/Live Chat": "23607369574812",
  "Failed Operations":   "17237919534108",
  "Automate Requests":   "24101419737116",
  "Architect Requests":  "24101684048412",
  "Tech Tickets":        "23571703153564",
  "High Priority":       "23645136614684",
  "All Open":            "15018924382748",
}

export const FAILED_OPS_VIEW_ID = "17237919534108"
export const KLARITY_DOMAINS = ["@klaritylaw.com", "@klarity.ai"]

export const KNOWN_CUSTOMERS = [
  "zuora","mongodb","stripe","doordash","sentinelone","miro",
  "linkedin","aven","quench","kimball","ipw","uhg","ramp"
]

export const CATEGORIES: Array<{
  label: string
  regex: RegExp | null
  tags: string[]
}> = [
  {
    label: "Architect Run Failure / Error running operation",
    regex: /error running|error while running|run fail|architect run|flow run|operation.*fail/i,
    tags: ["architect_run_failure", "operation___workflow_fail", "bugs/issues"],
  },
  {
    label: "Unable to login / Access issues",
    regex: /unable.*(login|log in|sign in)|login issue|access|password|temp.*pass|sso|new.*workspace|workspace.*modif/i,
    tags: ["login", "access", "workspace"],
  },
  {
    label: "Table matching / Data issues",
    regex: /mismatch|match|table|missing.*line|incorrect|revenue|duplicate|deal|renewal|discrepan/i,
    tags: ["matching", "table_matching", "revenue", "integration_issue"],
  },
  {
    label: "AI / Transcript / Hallucination issues",
    regex: /hallucin|transcript|ai interviewer|coach|indexing|insight|pilot/i,
    tags: ["transcript_processing/hallucinations", "indexing/insights_errors", "coach"],
  },
  {
    label: "Screenshot / Image / SOP issues",
    regex: /screenshot|image placement|sop|screen share/i,
    tags: [],
  },
  {
    label: "Token / Time limits",
    regex: /token|time limit|update with ai|anthropic token/i,
    tags: [],
  },
  {
    label: "Timeouts / Performance",
    regex: /timeout|concurrent|performance|slow/i,
    tags: [],
  },
  {
    label: "Feedback / Feature Request",
    regex: /feedback|feature request/i,
    tags: ["feedback"],
  },
  {
    label: "Others",
    regex: null,
    tags: [],
  },
]

export const TOP_ISSUES: Array<{ label: string; regex: RegExp }> = [
  { label: "Run Failure / Architect errors",  regex: /error running|error while running|run fail|flow run/i },
  { label: "Login / Access / Workspace",      regex: /login|access|password|workspace|temp.*pass/i },
  { label: "Table matching / Data issues",    regex: /mismatch|match|table|missing|duplicate|deal|revenue|discrepan/i },
  { label: "AI / Transcript / Hallucination", regex: /hallucin|transcript|ai interviewer|coach|pilot/i },
]
