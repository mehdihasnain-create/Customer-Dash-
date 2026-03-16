import { CATEGORIES, KNOWN_CUSTOMERS } from "./constants"
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
  return s[Math.floor(s.length / 2)]
}

export function avg(values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export function p90(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length * 0.9)]
}

export function fh(v: number | null): string {
  return v !== null ? `${v}h` : "-"
}

export function categorize(tickets: ZendeskTicket[]): Record<string, ZendeskTicket[]> {
  const result: Record<string, ZendeskTicket[]> = {}
  for (const { label } of CATEGORIES) result[label] = []

  for (const t of tickets) {
    const subj = t.subject || ""
    const tags = tagsOf(t)
    for (const { label, regex, tags: tagList } of CATEGORIES) {
      if (regex === null || regex.test(subj) || tagList.some(tg => tags.has(tg))) {
        result[label].push(t)
        break
      }
    }
  }
  return result
}

export function extractCustomer(t: ZendeskTicket): string {
  const subj = t.subject || ""
  const m = subj.match(/<>([^|<>]+)\s*\|\|/)
  if (m) return m[1].trim()
  if (subj.includes("||")) {
    const part = subj.split("||")[0].trim()
    if (part.length < 40) return part
  }
  const tags = tagsOf(t)
  for (const k of KNOWN_CUSTOMERS) {
    if ([...tags].some(tg => tg.toLowerCase().includes(k))) {
      return k.charAt(0).toUpperCase() + k.slice(1)
    }
  }
  return "Other"
}
