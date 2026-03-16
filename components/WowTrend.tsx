"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts"
import { WeekData } from "@/lib/types"
import { TOP_ISSUES } from "@/lib/constants"

interface Props {
  displayWeeks: WeekData[]
  sub: string
  startWk: number
  endWk: number
}

function su(sub: string, q: string) { return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}` }

export default function WowTrend({ displayWeeks, sub, startWk, endWk }: Props) {
  const data = displayWeeks.map(w => ({ name: w.label, count: w.count, display: w.display }))
  const topWeeks = displayWeeks.length >= 4 ? displayWeeks.slice(-4) : displayWeeks

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
        <h2 className="text-lg font-extrabold">Week by Week Trend — Wk {startWk} to Wk {endWk}</h2>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 24, right: 16, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#555" }}
                       angle={displayWeeks.length > 8 ? -45 : 0} textAnchor={displayWeeks.length > 8 ? "end" : "middle"} />
                <YAxis tick={{ fontSize: 11, fill: "#555" }} />
                <Tooltip formatter={(v, _n, p) => [v, (p as { payload?: { display?: string } }).payload?.display ?? ""]} />
                <Bar dataKey="count" fill="var(--orange)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#555" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold mb-2">Top Issues (last 4 wks)</p>
          <table className="styled-table">
            <thead>
              <tr>
                <th>Issue</th>
                {topWeeks.map(w => <th key={w.weekNum}>{w.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TOP_ISSUES.map(({ label, regex }) => (
                <tr key={label}>
                  <td>{label}</td>
                  {topWeeks.map(w => {
                    const count = w.tickets.filter(t => regex.test(t.subject || "")).length
                    const url = su(sub, `type:ticket created>${w.start} created<${w.end}`)
                    return (
                      <td key={w.weekNum}>
                        {count > 0
                          ? <a href={url} target="_blank" rel="noreferrer">{count}</a>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
