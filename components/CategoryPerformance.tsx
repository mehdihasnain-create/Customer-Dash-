import { CategoryPerf } from "@/lib/types"
import { fh } from "@/lib/dataTransforms"
import { since4Weeks } from "@/lib/weekUtils"
import { FIELD_IDS } from "@/lib/constants"

interface Props { catPerf: CategoryPerf[]; sub: string }

const C = {
  onSurface:   "#dae2fd",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  error:       "#ffb4ab",
}

export default function CategoryPerformance({ catPerf, sub }: Props) {
  const s4 = since4Weeks()
  const categoryUrl = (label: string) => {
    const q = `type:ticket created>${s4} custom_field_${FIELD_IDS.ISSUE_TYPE}:"${label}"`
    return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}`
  }

  if (!catPerf.length) return (
    <p className="text-xs p-6" style={{ color: C.onSecondary }}>No categorized tickets in the last 4 weeks.</p>
  )

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th style={{ textAlign: "right" }}>Tickets</th>
            <th style={{ textAlign: "right" }}>Median</th>
            <th style={{ textAlign: "right" }}>Average</th>
            <th style={{ textAlign: "right" }}>P90</th>
            <th style={{ textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {catPerf.map(cat => {
            const url = categoryUrl(cat.label)
            const isAlert = cat.p90 !== null && cat.p90 > 48
            return (
              <tr key={cat.label}>
                <td>
                  <a href={url} target="_blank" rel="noreferrer">{cat.label}</a>
                </td>
                <td>
                  <a href={url} target="_blank" rel="noreferrer">{cat.count}</a>
                </td>
                <td style={{ color: C.onVariant }}>{fh(cat.median)}</td>
                <td style={{ color: C.onVariant }}>{fh(cat.average)}</td>
                <td style={{ color: isAlert ? C.error : C.onVariant }}>{fh(cat.p90)}</td>
                <td style={{ textAlign: "center" }}>
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      background: isAlert ? C.error : C.tertiary,
                      boxShadow: isAlert
                        ? "0 0 6px rgba(255,180,171,0.5)"
                        : "0 0 6px rgba(60,221,199,0.5)",
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
