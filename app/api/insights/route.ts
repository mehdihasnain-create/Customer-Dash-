import "server-only"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "MISSING_BODY" }, { status: 400 })

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: "NO_API_KEY" }, { status: 500 })

  const {
    product, weekRange, received, open, solved, resolutionRate,
    topCategories, topCustomers, customerBreakdown, weekTrend, archBuckets, foCount,
    wowDelta, staleOpen,
  } = body

  const wowLine = wowDelta !== null && wowDelta !== undefined
    ? ` (${wowDelta > 0 ? "+" : ""}${wowDelta}% week-over-week)`
    : ""

  const prompt = `You are a senior CX operations analyst at Klarity, a B2B SaaS company. Perform a deep multi-section analysis of the following support data for the ${product} product, ${weekRange}.

═══ DATA ═══

VOLUME SUMMARY
- Received: ${received} tickets${wowLine}
- Open/Pending: ${open}${staleOpen > 0 ? ` — ${staleOpen} stale >48h unresolved` : ""}
- Solved/Closed: ${solved}
- Resolution Rate: ${resolutionRate}%
- Failed Operations (excluded): ${foCount}
${archBuckets ? `
ARCHITECT BREAKDOWN
- Failure Notifications: ${archBuckets.fn} (${received > 0 ? Math.round(archBuckets.fn / received * 100) : 0}%)
- Internal Requests: ${archBuckets.internal} (${received > 0 ? Math.round(archBuckets.internal / received * 100) : 0}%)
- Customer Tickets: ${archBuckets.customer} (${received > 0 ? Math.round(archBuckets.customer / received * 100) : 0}%)` : ""}

TOP CATEGORIES (last 4 weeks — count / median hrs / P90 hrs):
${topCategories.map((c: { label: string; count: number; median: number | null; p90?: number | null }) =>
  `- ${c.label}: ${c.count} tickets | median ${c.median ?? "—"}h | P90 ${c.p90 ?? "—"}h`).join("\n")}

TOP CUSTOMERS BY VOLUME:
${topCustomers.map((c: { name: string; count: number }) => `- ${c.name}: ${c.count} tickets`).join("\n")}

CUSTOMER BREAKDOWN (received / open / solved / res% / avg resolution / top issue):
${(customerBreakdown || []).map((c: { name: string; total: number; open: number; solved: number; resRate: number; avgResHours: number | null; topIssue: string }) =>
  `- ${c.name}: ${c.total} received | ${c.open} open | ${c.solved} solved | ${c.resRate}% res | avg ${c.avgResHours ?? "—"}h | ${c.topIssue}`
).join("\n")}

WEEKLY TREND (oldest → newest):
${weekTrend.map((w: { label: string; count: number }) => `${w.label}: ${w.count}`).join(" → ")}

═══ INSTRUCTIONS ═══

Analyse deeply. Be specific — name customers, categories, and numbers. Do not use generic filler.
Return ONLY a valid JSON object, no markdown fences, no explanation:

{
  "executive": {
    "healthScore": <integer 1-10>,
    "status": <"HEALTHY" | "STABLE" | "AT_RISK" | "CRITICAL">,
    "headline": "<one sentence — include the single most important number>",
    "wins": ["<specific win with data>", "<specific win with data>"],
    "risks": ["<specific risk — name customer or category>"],
    "recommendation": "<most important action for leadership this week>"
  },
  "customers": {
    "summary": "<one sentence on customer concentration or risk level>",
    "atRisk": ["<CustomerName: specific reason — volume, open tickets, trend>"],
    "insights": [
      "<insight about customer distribution or concentration>",
      "<insight about a specific customer pattern>",
      "<insight about new or unusual customer volume>"
    ]
  },
  "categories": {
    "summary": "<one sentence on overall category health>",
    "bottleneck": "<specific category with worst SLA or highest volume and why it matters>",
    "insights": [
      "<insight about top category — volume and resolution>",
      "<insight about P90 outlier or SLA breach risk>",
      "<actionable category recommendation>"
    ]
  },
  "trend": {
    "summary": "<one sentence describing the volume pattern>",
    "pattern": "<describe what the week-over-week data shows — is it growing, stable, spiking?>",
    "insights": [
      "<specific trend observation with numbers>",
      "<what this trend means for staffing or capacity>"
    ]
  },
  "resolution": {
    "summary": "<one sentence on resolution health vs target>",
    "concern": "<specific SLA concern — category, customer, or stale ticket count>",
    "insights": [
      "<insight on resolution rate — is it improving or declining?>",
      "<insight on what is slowing resolution>",
      "<recommendation to improve resolution speed>"
    ]
  }
}`

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://klarity-cx.vercel.app",
        "X-Title": "Klarity CX Dashboard",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      let detail = err
      try { detail = JSON.parse(err)?.error?.message || err } catch { /* ignore */ }
      return NextResponse.json({ error: "OPENROUTER_ERROR", detail }, { status: 502 })
    }

    const data = await res.json()
    let text = data.choices?.[0]?.message?.content || ""
    text = text.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim()

    try {
      const analysis = JSON.parse(text)
      return NextResponse.json({ analysis })
    } catch {
      return NextResponse.json({
        analysis: {
          executive: {
            healthScore: null, status: "STABLE",
            headline: text, wins: [], risks: [], recommendation: "",
          },
          customers: { summary: "", atRisk: [], insights: [] },
          categories: { summary: "", bottleneck: "", insights: [] },
          trend: { summary: "", pattern: "", insights: [] },
          resolution: { summary: "", concern: "", insights: [] },
        },
      })
    }
  } catch (e) {
    return NextResponse.json({ error: "FETCH_ERROR", message: (e as Error).message }, { status: 502 })
  }
}
