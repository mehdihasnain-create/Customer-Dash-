"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { CategoryPerf } from "@/lib/types"

interface Props { catPerf: CategoryPerf[] }

const tooltipStyle = {
  background: "#2d3449",
  border: "1px solid rgba(69,70,77,0.4)",
  borderRadius: 8,
  color: "#dae2fd",
  fontSize: 12,
}

export default function ResolutionChart({ catPerf }: Props) {
  const data = catPerf
    .filter(c => c.median !== null)
    .map(c => ({
      name: c.label.split("/")[0].trim().slice(0, 24),
      Median:  c.median,
      Average: c.average,
      P90:     c.p90,
    }))

  if (!data.length) return (
    <p className="text-xs py-4" style={{ color: "#a9bad3" }}>
      No closed tickets yet — resolution times will appear once tickets are solved.
    </p>
  )

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 20, bottom: 70, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(69,70,77,0.3)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#c6c6cd" }}
                 angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#c6c6cd" }} axisLine={false} tickLine={false}
                 label={{ value: "hrs", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#a9bad3" } }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(137,206,255,0.05)" }} />
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 11, color: "#c6c6cd" }} />
          <Bar dataKey="Median"  fill="#89ceff" radius={[3,3,0,0]} />
          <Bar dataKey="Average" fill="#3cddc7" radius={[3,3,0,0]} />
          <Bar dataKey="P90"     fill="#ffb4ab" radius={[3,3,0,0]} fillOpacity={0.75} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
