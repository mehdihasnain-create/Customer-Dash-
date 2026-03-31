"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts"
import { WeekData } from "@/lib/types"
import { TOP_ISSUES } from "@/lib/constants"

interface Props { displayWeeks: WeekData[]; sub: string; startWk: number; endWk: number }

const C = {
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  highest:     "#2d3449",
  outline:     "rgba(69,70,77,0.15)",
}

const tooltipStyle = {
  background: "#2d3449",
  border: "1px solid rgba(69,70,77,0.4)",
  borderRadius: 8,
  color: "#dae2fd",
  fontSize: 12,
}

function su(sub: string, q: string) { return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}` }

export default function WowTrend({ displayWeeks, sub, startWk, endWk }: Props) {
  const data = displayWeeks.map(w => ({ name: w.label, count: w.count, display: w.display }))
  const topWeeks = displayWeeks.length >= 4 ? displayWeeks.slice(-4) : displayWeeks

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex gap-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.primary }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.onVariant }}>Received</span>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(69,70,77,0.3)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.onVariant }}
                   angle={displayWeeks.length > 10 ? -45 : 0}
                   textAnchor={displayWeeks.length > 10 ? "end" : "middle"}
                   axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.onVariant }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(137,206,255,0.06)" }}
              formatter={(v, _n, p) => [v, (p as { payload?: { display?: string } }).payload?.display ?? ""]}
            />
            <Bar dataKey="count" fill={C.primary} radius={[4, 4, 0, 0]} fillOpacity={0.9}>
              <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: C.onVariant }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top issues matrix */}
      {topWeeks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: C.onVariant }}>
            Top Issues · Last 4 Weeks
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue</th>
                {topWeeks.map(w => <th key={w.weekNum} style={{ textAlign: "right" }}>{w.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TOP_ISSUES.map(({ label, regex }) => (
                <tr key={label}>
                  <td>{label}</td>
                  {topWeeks.map(w => {
                    const count = (w.tickets || []).filter(t => regex.test(t.subject || "")).length
                    const url = su(sub, `type:ticket created>${w.start} created<${w.end}`)
                    return (
                      <td key={w.weekNum}>
                        {count > 0
                          ? <a href={url} target="_blank" rel="noreferrer">{count}</a>
                          : <span style={{ color: "rgba(69,70,77,0.8)" }}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
