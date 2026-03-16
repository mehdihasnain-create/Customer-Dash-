import { CategoryPerf } from "@/lib/types"
import { fh } from "@/lib/dataTransforms"
import { since4Weeks } from "@/lib/weekUtils"

interface Props { catPerf: CategoryPerf[]; sub: string }

export default function CategoryPerformance({ catPerf, sub }: Props) {
  const s4 = since4Weeks()
  const su = (q: string) => `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}`

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
        <h2 className="text-lg font-extrabold">Support Performance by Category — Last 4 Weeks</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3">Fixed window: always last 4 complete Mon–Sun weeks from {s4}.</p>
      {catPerf.length ? (
        <table className="styled-table">
          <thead><tr>
            <th>Sub Issue Type</th><th>Ticket Count</th><th>Median (hrs)</th><th>Average (hrs)</th><th>P90 (hrs)</th>
          </tr></thead>
          <tbody>
            {catPerf.map(cat => {
              const url = su(`type:ticket created>${s4} tags:customer`)
              return (
                <tr key={cat.label}>
                  <td><a href={url} target="_blank" rel="noreferrer">{cat.label}</a></td>
                  <td><a href={url} target="_blank" rel="noreferrer">{cat.count}</a></td>
                  <td>{fh(cat.median)}</td>
                  <td>{fh(cat.average)}</td>
                  <td>{fh(cat.p90)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-400">No categorized tickets found in the last 4 weeks.</p>
      )}
    </div>
  )
}
