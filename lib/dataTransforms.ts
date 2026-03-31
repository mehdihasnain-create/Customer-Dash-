import { CATEGORIES, KNOWN_CUSTOMERS, FIELD_IDS } from "./constants"
import { ZendeskTicket } from "./types"
import { tagsOf, isClosed } from "./ticketClassifiers"

export function resHours(t: ZendeskTicket): number | null {
  if (!isClosed(t)) return null
  try {
    const created = new Date(t.created_at).getTime()
    const solvedStr = t.solved_at ?? t.updated_at
    const solved = new Date(solvedStr).getTime()
    const h = Math.round((solved - created) / 3_600_000)
    return h >= 0 ? h : null
  } catch {
    return null
  }
}

export function med(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid]
}

export function avg(values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export function p90(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  return s[Math.ceil(s.length * 0.9) - 1]
}

export function fh(v: number | null): string {
  return v !== null ? `${v}h` : "-"
}

export function categorize(tickets: ZendeskTicket[]): Record<string, ZendeskTicket[]> {
  const result: Record<string, ZendeskTicket[]> = {}

  for (const t of tickets) {
    // Primary: Issue Type / Sub Issue Type custom fields — team-set ground truth
    const issueType = getCustomField(t, FIELD_IDS.ISSUE_TYPE)
    const subIssue  = getCustomField(t, FIELD_IDS.SUB_ISSUE_TYPE)
    const cfLabel   = issueType || subIssue
    if (cfLabel) {
      if (!result[cfLabel]) result[cfLabel] = []
      result[cfLabel].push(t)
      continue
    }

    // Fallback: regex + tag matching
    const subj = t.subject || ""
    const tags = tagsOf(t)
    let matched = false
    for (const cat of CATEGORIES) {
      if (cat.regex === null || cat.regex.test(subj) || cat.tags.some(tg => tags.has(tg))) {
        if (!result[cat.label]) result[cat.label] = []
        result[cat.label].push(t)
        matched = true
        break
      }
    }
    if (!matched) {
      if (!result["Others"]) result["Others"] = []
      result["Others"].push(t)
    }
  }

  return result
}

const GENERIC_DOMAINS = new Set(["gmail","yahoo","outlook","hotmail","icloud","me","protonmail","live","msn"])

export function getCustomField(t: ZendeskTicket, id: number): string | null {
  const f = (t.custom_fields || []).find(f => f.id === id)
  return f?.value?.trim() || null
}

export function extractCustomer(t: ZendeskTicket): string {
  // Signal 1: Workspace Name custom field — most direct identifier
  const workspaceName = getCustomField(t, FIELD_IDS.WORKSPACE_NAME)
  if (workspaceName && workspaceName.length > 1) return workspaceName

  // Signal 2: User Org custom field
  const userOrg = getCustomField(t, FIELD_IDS.USER_ORG)
  if (userOrg && userOrg.length > 1) return userOrg

  const subj = t.subject || ""

  // Signal 3: <> CUSTOMER || pattern in subject
  const m = subj.match(/<>([^|<>]+)\s*\|\|/)
  if (m) return m[1].trim()

  // Signal 4: CUSTOMER || pattern in subject
  if (subj.includes("||")) {
    const part = subj.split("||")[0].trim()
    if (part.length < 40) return part
  }

  // Signal 5: known customer tags (exact match)
  const tags = tagsOf(t)
  for (const k of KNOWN_CUSTOMERS) {
    if (tags.has(k) || tags.has(`customer_${k}`)) {
      return k.charAt(0).toUpperCase() + k.slice(1)
    }
  }

  // Signal 6: requester email domain
  const email = (t._requester_email || "").toLowerCase()
  if (email.includes("@")) {
    if (email.endsWith("@klarity.ai") || email.endsWith("@klaritylaw.com")) return "Internal"
    const domain = email.split("@")[1] || ""
    const parts = domain.split(".")
    const company = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
    if (company && !GENERIC_DOMAINS.has(company) && company.length > 1) {
      return company.charAt(0).toUpperCase() + company.slice(1)
    }
  }

  return "Other"
}
