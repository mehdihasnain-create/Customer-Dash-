import { NextRequest, NextResponse } from "next/server"
import { fetchView, fetchSearch } from "@/lib/zendeskClient"
import { FILTERS, CATEGORIES } from "@/lib/constants"
import { getYearWeeks, since4Weeks, inWeek } from "@/lib/weekUtils"
import { isExcluded, isOpen, isClosed } from "@/lib/ticketClassifiers"
import { categorize, resHours, med, avg, p90 } from "@/lib/dataTransforms"
import { ZendeskTicket, WeekData } from "@/lib/types"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.subdomain || !body?.email || !body?.token || !body?.since) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 })
  }

  const { subdomain, email, token, since } = body
  const authHeader = "Basic " + Buffer.from(`${email}/token:${token}`).toString("base64")

  try {
    // 1. Failed Ops first → build exclusion set
    const foView = await fetchView(subdomain, authHeader, FILTERS["Failed Operations"])
    const foIds = new Set<number>(foView.map((t: ZendeskTicket) => t.id))

    // 2. All other views in parallel (batched to avoid rate limits)
    const viewNames = Object.keys(FILTERS).filter(n => n !== "Failed Operations")
    const batch1 = viewNames.slice(0, 4)
    const batch2 = viewNames.slice(4)
    const results1 = await Promise.all(
      batch1.map(name => fetchView(subdomain, authHeader, FILTERS[name], since))
    )
    const results2 = await Promise.all(
      batch2.map(name => fetchView(subdomain, authHeader, FILTERS[name], since))
    )
    const viewTickets: Record<string, ZendeskTicket[]> = { "Failed Operations": foView }
    ;[...batch1, ...batch2].forEach((name, i) => {
      viewTickets[name] = i < 4 ? results1[i] : results2[i - 4]
    })

    // 3. Broad search
    const allTickets = await fetchSearch(subdomain, authHeader, `type:ticket created>${since}`)

    // 4. Attach emails from view tickets
    const emailMap: Record<number, string> = {}
    for (const vl of Object.values(viewTickets)) {
      for (const t of vl) {
        if (t._requester_email) emailMap[t.id] = t._requester_email
      }
    }
    for (const t of allTickets) {
      if (!t._requester_email) t._requester_email = emailMap[t.id] || ""
    }

    // 5. Exclusion
    const real     = allTickets.filter(t => !isExcluded(t, foIds))
    const excluded = allTickets.filter(t => isExcluded(t, foIds))
    const openTickets   = real.filter(isOpen)
    const closedTickets = real.filter(isClosed)

    // 6. Channels
    const channels: Record<string, { tickets: ZendeskTicket[], open: ZendeskTicket[], closed: ZendeskTicket[] }> = {}
    for (const name of ["AI Bot","Messaging/Live Chat","Automate Requests","Architect Requests","Tech Tickets","High Priority","All Open"]) {
      const t = (viewTickets[name] || []).filter(x => !isExcluded(x, foIds))
      channels[name] = { tickets: t, open: t.filter(isOpen), closed: t.filter(isClosed) }
    }

    // 7. Category performance (last 4 weeks fixed window)
    const s4 = since4Weeks()
    const real4w = real.filter(t => (t.created_at || "").slice(0, 10) >= s4)
    const catMap = categorize(real4w)
    const catPerf = CATEGORIES
      .map(({ label }) => {
        const tix = catMap[label] || []
        if (!tix.length) return null
        const times = tix.map(resHours).filter((h): h is number => h !== null)
        return { label, count: tix.length, median: med(times), average: avg(times), p90: p90(times) }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count))

    // 8. Week-by-week
    const year = new Date().getFullYear()
    const weekDefs = getYearWeeks(year)
    const allWeeks: WeekData[] = weekDefs.map(w => ({
      ...w,
      tickets: real.filter(t => inWeek(t, w)),
      count: 0,
    }))
    for (const w of allWeeks) w.count = w.tickets.length

    // 9. Unsolved
    const unsolvedTickets = (viewTickets["All Open"] || []).filter(t => !isExcluded(t, foIds))

    return NextResponse.json({
      real, openTickets, closedTickets, channels, catPerf, allWeeks,
      unsolvedTickets, foCount: foView.length,
      foIds: [...foIds], excluded, since,
    })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status === 401) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    return NextResponse.json({ error: "ZENDESK_ERROR", message: e?.message }, { status: 502 })
  }
}
