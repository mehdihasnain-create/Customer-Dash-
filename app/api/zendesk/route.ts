import { NextRequest, NextResponse } from "next/server"
import { fetchView, fetchSearch } from "@/lib/zendeskClient"
import { FILTERS, CATEGORIES } from "@/lib/constants"
import { getYearWeeks, since4Weeks, inWeek } from "@/lib/weekUtils"
import { isExcluded, isOpen, isClosed, isAutomateTicket } from "@/lib/ticketClassifiers"
import { categorize, resHours, med, avg, p90 } from "@/lib/dataTransforms"
import { getCachedWeek, setCachedWeek } from "@/lib/weekCache"
import { ZendeskTicket, WeekData } from "@/lib/types"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.subdomain || !body?.email || !body?.token || !body?.since) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 })
  }

  const { subdomain, email, token, since, until } = body
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

    // 3. Cache-aware weekly ticket fetching.
    //    Past weeks are loaded from Vercel Blob (instant). Current week and any
    //    uncached past weeks are fetched from Zendesk then saved to blob.
    const year      = new Date().getFullYear()
    const allWeekDefs = getYearWeeks(year)
    const curWeekNum  = allWeekDefs[allWeekDefs.length - 1].weekNum
    const since4w     = since4Weeks()
    const tomorrow    = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const windowStart = since4w < since ? since4w : since
    const windowEnd   = (until && until > tomorrow) ? until : tomorrow

    // Find all ISO weeks that overlap the fetch window
    const neededWeeks = allWeekDefs.filter(w => w.start < windowEnd && w.end > windowStart)

    const weekTicketSets = await Promise.all(
      neededWeeks.map(async w => {
        const isCurrent = w.weekNum === curWeekNum

        // Serve past weeks from blob cache
        if (!isCurrent) {
          const cached = await getCachedWeek(subdomain, year, w.weekNum)
          if (cached) return cached
        }

        // Fetch from Zendesk
        const tickets = await fetchSearch(
          subdomain, authHeader,
          `type:ticket created>${w.start} created<${w.end}`
        )

        // Persist past weeks to blob for future requests
        if (!isCurrent) {
          await setCachedWeek(subdomain, year, w.weekNum, tickets)
        }

        return tickets
      })
    )

    const ticketMap = new Map<number, ZendeskTicket>()
    for (const batch of weekTicketSets) for (const t of batch) ticketMap.set(t.id, t)
    const allTickets = [...ticketMap.values()]

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

    // 5. Exclusion → split into Architect and Automate
    const real     = allTickets.filter(t => !isExcluded(t, foIds))
    const excluded = allTickets.filter(t => isExcluded(t, foIds))

    const architectReal = real.filter(t => !isAutomateTicket(t))
    const automateReal  = real.filter(t => isAutomateTicket(t))

    const openTickets   = architectReal.filter(isOpen)
    const closedTickets = architectReal.filter(isClosed)
    const automateOpenTickets   = automateReal.filter(isOpen)
    const automateClosedTickets = automateReal.filter(isClosed)

    // 6. Channels
    // Views API only returns currently-active (open) tickets — closed tickets are excluded.
    // For channels we can classify from the search results, we use the full set (open + closed).
    // For channels we can't classify (AI Bot, Live Chat, Tech Tickets), we keep view data.
    const channels: Record<string, { tickets: ZendeskTicket[], open: ZendeskTicket[], closed: ZendeskTicket[] }> = {}

    // View-based channels (open only — no classification logic available)
    for (const name of ["AI Bot","Messaging/Live Chat","Tech Tickets","High Priority","All Open"]) {
      const t = (viewTickets[name] || []).filter(x => !isExcluded(x, foIds))
      channels[name] = { tickets: t, open: t.filter(isOpen), closed: t.filter(isClosed) }
    }

    // Search-based channels (accurate open + closed counts)
    channels["Automate Requests"] = {
      tickets: automateReal,
      open:    automateReal.filter(isOpen),
      closed:  automateReal.filter(isClosed),
    }
    channels["Architect Requests"] = {
      tickets: architectReal,
      open:    architectReal.filter(isOpen),
      closed:  architectReal.filter(isClosed),
    }

    // 7. Category performance (last 4 weeks fixed window) — Architect
    const s4 = since4Weeks()
    const arch4w = architectReal.filter(t => (t.created_at || "").slice(0, 10) >= s4)
    const catMap = categorize(arch4w)
    const catPerf = Object.entries(catMap)
      .map(([label, tix]) => {
        if (!tix.length) return null
        const times = tix.map(resHours).filter((h): h is number => h !== null)
        return { label, count: tix.length, median: med(times), average: avg(times), p90: p90(times) }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count))

    // 7b. Category performance — Automate
    const auto4w = automateReal.filter(t => (t.created_at || "").slice(0, 10) >= s4)
    const automateCatMap = categorize(auto4w)
    const automateCatPerf = Object.entries(automateCatMap)
      .map(([label, tix]) => {
        if (!tix.length) return null
        const times = tix.map(resHours).filter((h): h is number => h !== null)
        return { label, count: tix.length, median: med(times), average: avg(times), p90: p90(times) }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count))

    // 8. Week-by-week counts — Architect & Automate (no tickets array in payload)
    const allWeeks: WeekData[] = allWeekDefs.map(w => ({
      ...w,
      count: architectReal.filter(t => inWeek(t, w)).length,
    }))
    const automateAllWeeks: WeekData[] = allWeekDefs.map(w => ({
      ...w,
      count: automateReal.filter(t => inWeek(t, w)).length,
    }))

    // 9. Unsolved
    const unsolvedTickets = (viewTickets["All Open"] || []).filter(t => !isExcluded(t, foIds))

    return NextResponse.json({
      real: architectReal, openTickets, closedTickets,
      channels, catPerf, allWeeks,
      unsolvedTickets, foCount: foView.length,
      foIds: [...foIds], excluded, since,
      automateReal, automateOpenTickets, automateClosedTickets,
      automateCatPerf, automateAllWeeks,
    })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status === 401) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    return NextResponse.json({ error: "ZENDESK_ERROR", message: e?.message || "Unknown error" }, { status: 502 })
  }
}
