import { ZendeskTicket } from "./types"
import { FIELD_IDS } from "./constants"

export function tagsOf(t: ZendeskTicket): Set<string> {
  return new Set(t.tags || [])
}

export function isBackendAlert(t: ZendeskTicket): boolean {
  return /\[BACKEND ALERT\]/i.test(t.subject || "")
}

export function isInternalTeams(t: ZendeskTicket): boolean {
  return tagsOf(t).has("internal_teams")
}

export function isUnassignedArchitectBot(t: ZendeskTicket): boolean {
  const email = (t._requester_email || "").toLowerCase()
  return email === "architect@klarity.ai" && !t.assignee_id
}

export function isCxTeam(t: ZendeskTicket): boolean {
  return tagsOf(t).has("cx_team")
}

export function ticketRaisedBy(t: ZendeskTicket): string {
  const f = (t.custom_fields || []).find(f => f.id === FIELD_IDS.TICKET_RAISED_BY)
  return (f?.value || "").toLowerCase().replace(/\s+/g, "_")
}

export function checkExclusion(
  t: ZendeskTicket,
  foIds: Set<number>
): { excluded: boolean; reason: string } {
  // Hard includes — explicitly customer-facing
  if (isCxTeam(t))                                    return { excluded: false, reason: "CX team engaged (cx_team tag)" }
  if (ticketRaisedBy(t) === "customer")               return { excluded: false, reason: "Ticket Raised by: Customer" }

  if (foIds.has(t.id))                  return { excluded: true, reason: "Failed Ops View: 17237919534108" }
  if (t.status === "new")               return { excluded: true, reason: "Status is 'new' (unactioned)" }
  if (isBackendAlert(t))                return { excluded: true, reason: "Subject contains [BACKEND ALERT]" }
  if (isUnassignedArchitectBot(t))      return { excluded: true, reason: "architect@klarity.ai requester with no assignee" }
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

const AUTOMATE_TAGS = new Set(["automate", "automate_architect", "automated_architect"])

export function isAutomateTicket(t: ZendeskTicket): boolean {
  return [...tagsOf(t)].some(tag => AUTOMATE_TAGS.has(tag))
}
