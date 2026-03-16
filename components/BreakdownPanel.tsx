"use client"
import { useMemo } from "react"
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList
} from "recharts"
import { ZendeskTicket } from "@/lib/types"
import { categorize, extractCustomer } from "@/lib/dataTransforms"
import { CATEGORIES } from "@/lib/constants"
import { isOpen } from "@/lib/ticketClassifiers"

interface Props {
  rangeReal: ZendeskTicket[]
  rangeOpen: ZendeskTicket[]
  rangeClosed: ZendeskTicket[]
  sub: string
  wSince: string
  wEnd: string
  startWk: number
  endWk: number
}

const STATUS_COLORS: Record<string, string> = {
  Open: "#E8612C", Pending: "#f4a261", Solved: "#2a9d8f", Closed: "#457b9d",
}

function su(sub: string, q: string) { return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}` }

export default function BreakdownPanel({ rangeReal, rangeOpen, rangeClosed, sub, wSince, wEnd, startWk, endWk }: Props) {
  const resPct = rangeReal.length ? Math.round(rangeClosed.length / rangeReal.length * 100) : 0

  // Status donut
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of rangeReal) {
      const s = t.status.charAt(0).toUpperCase() + t.status.slice(1)
      counts[s] = (counts[s] || 0) + 1
    }
    return ["Open","Pending","Solved","Closed"]
      .filter(s => counts[s])
      .map(s => ({ name: s, value: counts[s] }))
  }, [rangeReal])

  // Customer breakdown
  const custData = useMemo(() => {
    const map: Record<string, { open: number; solved: number }> = {}
    for (const t of rangeReal) {
      const c = extractCustomer(t)
      if (!map[c]) map[c] = { open: 0, solved: 0 }
      if (isOpen(t)) map[c].open++; else map[c].solved++
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.open + v.solved }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
  }, [rangeReal])

  // Daily volume
  const dailyData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of rangeReal) {
      const d = (t.created_at || "").slice(0, 10)
      if (d) counts[d] = (counts[d] || 0) + 1
    }
    const dates = Object.keys(counts).sort()
    const vals = dates.map(d => counts[d])
    const avgCount = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { dates, vals, avgCount }
  }, [rangeReal])

  const dailyChartData = dailyData.dates.map((d, i) => {
    const wd = new Date(d + "T00:00:00").getDay()
    const v = dailyData.vals[i]
    const color = wd === 0 || wd === 6 ? "#d0e8e4" : v >= dailyData.avgCount * 1.5 ? "#c94e20" : "#E8612C"
    return { date: d, count: v, color }
  })

  // Category bar
  const catData = useMemo(() => {
    const catMap = categorize(rangeReal)
    return CATEGORIES
      .map(({ label }) => ({ name: label.split("/")[0].trim().slice(0, 26), value: (catMap[label] || []).length }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [rangeReal])
  const maxCat = catData[0]?.value || 1

  if (!rangeReal.length) return null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
        <h2 className="text-lg font-extrabold">
          Ticket Breakdown — Wk {startWk} to Wk {endWk}{" "}
          <span className="font-normal text-sm text-gray-400">
            {rangeReal.length} received · {rangeOpen.length} open · {rangeClosed.length} solved
          </span>
        </h2>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-sm font-bold mb-2">Status Distribution</p>
          <div style={{ height: 300, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius="52%" outerRadius="72%"
                     paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || "#ccc"} stroke="#fff" strokeWidth={3} />
                  ))}
                </Pie>
                <PieTooltip formatter={(v, name) => [`${v} tickets`, name as string]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#2a9d8f" }}>{resPct}%</div>
              <div style={{ fontSize: 11, color: "#888" }}>resolved</div>
            </div>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {statusData.map(s => (
                <span key={s.name} className="flex items-center gap-1 text-xs">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[s.name], display: "inline-block" }} />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold mb-2">Top Customers by Volume</p>
          <table className="styled-table">
            <thead><tr><th>Customer</th><th>Open</th><th>Solved</th><th>Total</th></tr></thead>
            <tbody>
              {custData.map(c => {
                const url = su(sub, `type:ticket created>${wSince} created<${wEnd} subject:${c.name}`)
                return (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.open}</td>
                    <td>{c.solved}</td>
                    <td><a href={url} target="_blank" rel="noreferrer"><strong>{c.total}</strong></a></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="text-sm font-bold mb-2">Daily Ticket Volume</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 20, right: 10, bottom: 50, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#555" }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: "#555" }} />
                <Tooltip />
                <ReferenceLine y={dailyData.avgCount} stroke="#888" strokeDasharray="4 3"
                               label={{ value: `Avg ${dailyData.avgCount.toFixed(1)}`, position: "right", fontSize: 10, fill: "#888" }} />
                <Bar dataKey="count" radius={[3,3,0,0]}>
                  {dailyChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9, fill: "#555" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-1">Dark orange = spike · Orange = normal · Teal = weekend</p>
        </div>

        <div>
          <p className="text-sm font-bold mb-2">Volume by Category</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#555" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#555" }} width={160} />
                <Tooltip />
                <Bar dataKey="value" radius={[0,3,3,0]}>
                  {catData.map((entry, i) => <Cell key={i} fill={entry.value === maxCat ? "#c94e20" : "#E8612C"} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#555" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
