"use client"
import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { ZendeskTicket } from "@/lib/types"
import { isOpen, isClosed } from "@/lib/ticketClassifiers"

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
  Solved:  "#3cddc7",
  Pending: "#b7c8e1",
  Open:    "#ffb4ab",
  Closed:  "#89ceff",
}

const C = {
  container:   "#171f33",
  highest:     "#2d3449",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  tertiary:    "#3cddc7",
  outline:     "rgba(69,70,77,0.15)",
}

export default function BreakdownPanel({ rangeReal, rangeOpen, rangeClosed }: Props) {
  const resPct = rangeReal.length ? Math.round(rangeClosed.length / rangeReal.length * 100) : 0

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of rangeReal) {
      const s = t.status.charAt(0).toUpperCase() + t.status.slice(1)
      counts[s] = (counts[s] || 0) + 1
    }
    return ["Solved", "Pending", "Open", "Closed"]
      .filter(s => counts[s])
      .map(s => ({ name: s, value: counts[s] }))
  }, [rangeReal])

  if (!rangeReal.length) return (
    <p className="text-xs text-center py-8" style={{ color: C.onSecondary }}>No data yet.</p>
  )

  return (
    <div>
      {/* Donut */}
      <div style={{ height: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius="58%" outerRadius="78%"
                 paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
              {statusData.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLORS[entry.name] || "#45464d"} stroke={C.container} strokeWidth={3} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: C.highest, border: `1px solid ${C.outline}`, borderRadius: 8, color: "#dae2fd", fontSize: 12 }}
              formatter={(v, name) => [`${v} tickets`, name as string]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.tertiary, letterSpacing: "-0.02em" }}>{resPct}%</div>
          <div style={{ fontSize: 9, color: C.onSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>resolved</div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-4">
        {statusData.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.name] }} />
            <span className="text-[10px]" style={{ color: C.onVariant }}>{s.name} ({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
