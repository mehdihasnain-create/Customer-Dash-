"use client"
import { useState, useMemo } from "react"
import { ZendeskTicket, CategoryPerf } from "@/lib/types"
import { extractCustomer, getCustomField, avg } from "@/lib/dataTransforms"
import { isOpen, isClosed } from "@/lib/ticketClassifiers"
import { FIELD_IDS } from "@/lib/constants"

const C = {
  container:   "#171f33",
  surfaceLow:  "#131b2e",
  high:        "#222a3d",
  highest:     "#2d3449",
  lowest:      "#060e20",
  onSurface:   "#dae2fd",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  error:       "#ffb4ab",
  warn:        "#ffb77c",
  outline:     "rgba(69,70,77,0.15)",
}

interface CustomerRow {
  name: string
  tickets: ZendeskTicket[]
  open: number
  solved: number
  total: number
  resRate: number
  topIssue: string
  avgResHours: number | null
}

function resColor(rate: number): string {
  if (rate >= 80) return C.tertiary
  if (rate >= 50) return C.warn
  return C.error
}

function SortIcon({ col, sort }: { col: string; sort: { col: string; asc: boolean } }) {
  if (sort.col !== col) return <span style={{ color: C.highest, fontSize: 10 }}>⇅</span>
  return <span style={{ color: C.primary, fontSize: 10 }}>{sort.asc ? "↑" : "↓"}</span>
}

function downloadCSV(rows: CustomerRow[]) {
  const header = ["Customer", "Received", "Open", "Solved", "Res%", "Avg Resolution (h)", "Top Issue"]
  const lines = rows.map(r => [
    `"${r.name}"`, r.total, r.open, r.solved, r.resRate,
    r.avgResHours ?? "", `"${r.topIssue}"`,
  ].join(","))
  const blob = new Blob([header.join(",") + "\n" + lines.join("\n")], { type: "text/csv" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
  a.download = `customer-intelligence-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

export default function CustomerList({
  tickets,
  catPerf,
  sub,
}: {
  tickets: ZendeskTicket[]
  catPerf: CategoryPerf[]
  sub: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ col: string; asc: boolean }>({ col: "total", asc: false })

  const rows = useMemo((): CustomerRow[] => {
    const map: Record<string, ZendeskTicket[]> = {}
    for (const t of tickets) {
      const name = extractCustomer(t)
      if (name === "Other") continue
      if (!map[name]) map[name] = []
      map[name].push(t)
    }

    return Object.entries(map).map(([name, tix]) => {
      const open   = tix.filter(isOpen).length
      const solved = tix.filter(isClosed).length
      const total  = tix.length
      const resRate = total > 0 ? Math.round(solved / total * 100) : 0

      // Top issue from Issue Type custom field, fallback to category perf
      const issueCounts: Record<string, number> = {}
      for (const t of tix) {
        const issue = getCustomField(t, FIELD_IDS.ISSUE_TYPE) || getCustomField(t, FIELD_IDS.SUB_ISSUE_TYPE)
        if (issue) issueCounts[issue] = (issueCounts[issue] || 0) + 1
      }
      const topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"

      // Avg resolution hours for solved tickets
      const resTimes = tix
        .filter(isClosed)
        .map(t => {
          try {
            const created = new Date(t.created_at).getTime()
            const solved  = new Date(t.solved_at ?? t.updated_at).getTime()
            const h = Math.round((solved - created) / 3_600_000)
            return h >= 0 ? h : null
          } catch { return null }
        })
        .filter((h): h is number => h !== null)

      return { name, tickets: tix, open, solved, total, resRate, topIssue, avgResHours: avg(resTimes) }
    })
  }, [tickets])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const base = q ? rows.filter(r => r.name.toLowerCase().includes(q)) : rows
    return [...base].sort((a, b) => {
      const av = a[sort.col as keyof CustomerRow] as number | null ?? -1
      const bv = b[sort.col as keyof CustomerRow] as number | null ?? -1
      return sort.asc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [rows, search, sort])

  function toggleSort(col: string) {
    setSort(s => s.col === col ? { col, asc: !s.asc } : { col, asc: false })
  }

  if (!rows.length) return (
    <p className="text-xs p-6" style={{ color: C.onSecondary }}>No customer data in selected range.</p>
  )

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: C.onSecondary,
    cursor: "pointer",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
    borderBottom: `1px solid ${C.outline}`,
    background: C.surfaceLow,
  }

  return (
    <div>
      {/* Search bar */}
      <div className="px-6 py-3" style={{ borderBottom: `1px solid ${C.outline}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full rounded px-3 py-1.5 text-xs"
          style={{ background: C.lowest, color: C.onSurface, border: `1px solid ${C.outline}`, outline: "none" }}
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-6 py-2.5" style={{ borderBottom: `1px solid ${C.outline}`, background: C.surfaceLow }}>
        <div className="flex items-center gap-6">
          <span className="text-[10px]" style={{ color: C.onSecondary }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>{filtered.length}</span> customers identified
          </span>
          <span className="text-[10px]" style={{ color: C.onSecondary }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>{rows.reduce((s, r) => s + r.total, 0)}</span> tickets mapped
          </span>
          <span className="text-[10px]" style={{ color: C.onSecondary }}>
            <span style={{ color: C.warn, fontWeight: 700 }}>{rows.filter(r => r.open > 0).length}</span> with open tickets
          </span>
        </div>
        <button
          onClick={() => downloadCSV(filtered)}
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded font-semibold transition-colors"
          style={{ background: C.high, color: C.onVariant }}
          onMouseEnter={e => (e.currentTarget.style.background = C.highest)}
          onMouseLeave={e => (e.currentTarget.style.background = C.high)}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th style={thStyle} onClick={() => toggleSort("name")}>Customer <SortIcon col="name" sort={sort} /></th>
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("total")}>Received <SortIcon col="total" sort={sort} /></th>
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("open")}>Open <SortIcon col="open" sort={sort} /></th>
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("solved")}>Solved <SortIcon col="solved" sort={sort} /></th>
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("resRate")}>Res% <SortIcon col="resRate" sort={sort} /></th>
              <th style={{ ...thStyle, textAlign: "center" }} onClick={() => toggleSort("avgResHours")}>Avg Res <SortIcon col="avgResHours" sort={sort} /></th>
              <th style={thStyle}>Top Issue</th>
              <th style={{ ...thStyle, textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <>
                <tr
                  key={row.name}
                  onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                  style={{ cursor: "pointer", borderBottom: `1px solid ${C.outline}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.high)}
                  onMouseLeave={e => (e.currentTarget.style.background = expanded === row.name ? C.high : "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                           style={{ background: row.open > 0 ? C.warn : C.tertiary }} />
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: C.onSurface, fontSize: 12, fontWeight: 700 }}>{row.total}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 12 }}>
                    {row.open > 0
                      ? <span style={{ color: C.warn, fontWeight: 700 }}>{row.open}</span>
                      : <span style={{ color: C.onSecondary }}>0</span>}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: C.onVariant, fontSize: 12 }}>{row.solved}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{ color: resColor(row.resRate), fontWeight: 700, fontSize: 12 }}>{row.resRate}%</span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: C.onSecondary, fontSize: 11 }}>
                    {row.avgResHours !== null ? `${row.avgResHours}h` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", maxWidth: 200 }}>
                    <span className="text-[10px] px-2 py-0.5 rounded truncate block" style={{ background: C.highest, color: C.onVariant }}>
                      {row.topIssue.length > 30 ? row.topIssue.slice(0, 28) + "…" : row.topIssue}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <span style={{ color: C.onSecondary, fontSize: 12 }}>{expanded === row.name ? "▲" : "▼"}</span>
                  </td>
                </tr>

                {/* Expanded ticket list */}
                {expanded === row.name && (
                  <tr key={`${row.name}-exp`}>
                    <td colSpan={8} style={{ padding: 0, background: C.lowest }}>
                      <div style={{ borderTop: `1px solid ${C.outline}`, borderBottom: `1px solid ${C.outline}` }}>
                        <div className="px-6 py-2 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.outline}` }}>
                          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: C.primary }}>
                            Recent Tickets — {row.name}
                          </span>
                        </div>
                        {row.tickets.slice(0, 10).map(t => (
                          <a
                            key={t.id}
                            href={`https://${sub}.zendesk.com/agent/tickets/${t.id}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-4 px-6 py-3 transition-colors"
                            style={{ borderBottom: `1px solid ${C.outline}`, textDecoration: "none", display: "flex" }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.high)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <span className="text-[10px] font-mono shrink-0" style={{ color: C.onSecondary }}>#{t.id}</span>
                            <span className="text-xs flex-1 truncate" style={{ color: C.onSurface }}>{t.subject}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0"
                                  style={{
                                    background: (t.status === "open" || t.status === "pending") ? "rgba(255,183,124,0.15)" : "rgba(60,221,199,0.1)",
                                    color: (t.status === "open" || t.status === "pending") ? C.warn : C.tertiary,
                                  }}>
                              {t.status}
                            </span>
                            {getCustomField(t, FIELD_IDS.ISSUE_TYPE) && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: C.highest, color: C.onSecondary }}>
                                {(getCustomField(t, FIELD_IDS.ISSUE_TYPE) || "").slice(0, 24)}
                              </span>
                            )}
                          </a>
                        ))}
                        {row.tickets.length > 10 && (
                          <p className="text-[10px] px-6 py-2" style={{ color: C.onSecondary }}>
                            +{row.tickets.length - 10} more tickets
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
