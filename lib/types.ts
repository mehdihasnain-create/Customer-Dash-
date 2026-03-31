export interface ZendeskTicket {
  id: number
  subject: string
  status: "new" | "open" | "pending" | "solved" | "closed"
  created_at: string
  updated_at: string
  solved_at?: string
  tags: string[]
  requester_id: number
  assignee_id: number | null
  custom_fields?: Array<{ id: number; value: string | null }>
  _requester_email?: string
}

export interface ChannelData {
  tickets: ZendeskTicket[]
  open: ZendeskTicket[]
  closed: ZendeskTicket[]
}

export interface CategoryPerf {
  label: string
  count: number
  median: number | null
  average: number | null
  p90: number | null
}

export interface WeekData {
  label: string
  weekNum: number
  start: string
  end: string
  display: string
  tickets?: ZendeskTicket[]
  count: number
}

export interface DashboardData {
  // Architect
  real: ZendeskTicket[]
  openTickets: ZendeskTicket[]
  closedTickets: ZendeskTicket[]
  channels: Record<string, ChannelData>
  catPerf: CategoryPerf[]
  allWeeks: WeekData[]
  unsolvedTickets: ZendeskTicket[]
  foCount: number
  foIds: number[]
  excluded: ZendeskTicket[]
  since: string
  // Automate
  automateReal: ZendeskTicket[]
  automateOpenTickets: ZendeskTicket[]
  automateClosedTickets: ZendeskTicket[]
  automateCatPerf: CategoryPerf[]
  automateAllWeeks: WeekData[]
}

export interface Credentials {
  subdomain: string
  email: string
  token: string
}
