import "server-only"
import { ZendeskTicket } from "./types"

async function zdGet(
  subdomain: string,
  authHeader: string,
  path: string,
  params: Record<string, string | number> = {}
) {
  const url = new URL(`https://${subdomain}.zendesk.com/api/v2${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    next: { revalidate: 300 },
  })
  if (res.status === 401) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 })
  if (!res.ok) throw Object.assign(new Error(`Zendesk error ${res.status}`), { status: res.status })
  return res.json()
}

export async function fetchView(
  subdomain: string,
  authHeader: string,
  viewId: string,
  since?: string
): Promise<ZendeskTicket[]> {
  const tickets: ZendeskTicket[] = []
  let page = 1
  while (true) {
    try {
      const data = await zdGet(subdomain, authHeader, `/views/${viewId}/tickets.json`, {
        per_page: 100,
        page,
        include: "users",
      })
      const users: Record<number, string> = {}
      for (const u of data.users || []) users[u.id] = u.email || ""
      const batch: ZendeskTicket[] = data.tickets || []
      for (const t of batch) t._requester_email = users[t.requester_id] || ""
      const filtered = since ? batch.filter(t => (t.created_at || "").slice(0, 10) >= since) : batch
      tickets.push(...filtered)
      if (!data.next_page || batch.length < 100) break
      page++
    } catch {
      break
    }
  }
  return tickets
}

export async function fetchSearch(
  subdomain: string,
  authHeader: string,
  query: string
): Promise<ZendeskTicket[]> {
  const tickets: ZendeskTicket[] = []
  let page = 1
  while (true) {
    const data = await zdGet(subdomain, authHeader, "/search.json", {
      query,
      per_page: 100,
      page,
    })
    const batch: ZendeskTicket[] = data.results || []
    tickets.push(...batch)
    if (!data.next_page || batch.length < 100) break
    page++
  }
  return tickets
}
