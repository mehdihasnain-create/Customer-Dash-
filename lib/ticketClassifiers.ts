import { ZendeskTicket } from "./types"

export function tagsOf(t: ZendeskTicket): Set<string> {
  return new Set(t.tags || [])
}

export function isBackendAlert(t: ZendeskTicket): boolean {
  return /\[BACKEND ALERT\]/i.test(t.subject || "")
}

export function isInternalTeams(t: ZendeskTicket): boolean {
  return tagsOf(t).has("internal_teams")
}

export function isInternalRunFailure(t: ZendeskTicket): boolean {
  const subj = t.subject || ""
  if (!/error running operation|error while running/i.test(subj)) return false
  if (tagsOf(t).has("customer")) return false
  return true
}

export function checkExclusion(
  t: ZendeskTicket,
  foIds: Set<number>
): { excluded: boolean; reason: string } {
  if (foIds.has(t.id))           return { excluded: true,  reason: "Failed Ops View: 17237919534108" }
  if (t.status === "new")        return { excluded: true,  reason: "Status is 'new' (automated)" }
  if (isBackendAlert(t))         return { excluded: true,  reason: "Subject contains [BACKEND ALERT]" }
  if (isInternalTeams(t))        return { excluded: true,  reason: "Has 'internal_teams' tag" }
  if (isInternalRunFailure(t))   return { excluded: true,  reason: "Internal run failure (no customer tag)" }
  return { excluded: false, reason: "Included" }
}

export function isExcluded(t: ZendeskTicket, foIds: Set<number>): boolean {
  return checkExclusion(t, foIds).excluded
}

export function isOpen(t: ZendeskTicket): boolean {
  return t.status === "open" || t.status === "pending"
}

export function isClosed(t: ZendeskTicket): boolean {
  return t.status === "solved" || t.status === "closed"
}
