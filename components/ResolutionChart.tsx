"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { CategoryPerf } from "@/lib/types"

interface Props { catPerf: CategoryPerf[] }

export default function ResolutionChart({ catPerf }: Props) {
  const data = catPerf
    .filter(c => c.median !== null)
    .map(c => ({
      name: c.label.split("/")[0].trim().slice(0, 26),
      Median:  c.median,
      Average: c.average,
      P90:     c.p90,
    }))

  if (!data.length) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
          <h2 className="text-lg font-extrabold">Resolution Time by Category</h2>
        </div>
        <p className="text-sm text-gray-400">No closed tickets yet — resolution times will appear once tickets are solved.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
        <h2 className="text-lg font-extrabold">Resolution Time by Category</h2>
      </div>
      <div style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 80, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#555" }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 11, fill: "#555" }} label={{ value: "Hours", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#888" } }} />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
            <Bar dataKey="Median"  fill="#E8612C" radius={[3,3,0,0]} />
            <Bar dataKey="Average" fill="#1a1a1a" fillOpacity={0.7} radius={[3,3,0,0]} />
            <Bar dataKey="P90"     fill="#f4c5aa" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
