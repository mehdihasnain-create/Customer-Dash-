import { ChannelData } from "@/lib/types"
import { FILTERS } from "@/lib/constants"

interface Props {
  channels: Record<string, ChannelData>
  sub: string
}

function fu(sub: string, fid: string) { return `https://${sub}.zendesk.com/agent/filters/${fid}` }

function ChannelTable({ title, rows }: { title: string; rows: { name: string; ch: ChannelData; url: string }[] }) {
  const totO = rows.reduce((s, r) => s + r.ch.open.length, 0)
  const totC = rows.reduce((s, r) => s + r.ch.closed.length, 0)
  const totT = rows.reduce((s, r) => s + r.ch.tickets.length, 0)

  return (
    <div>
      <p className="text-sm font-bold mb-2">{title}</p>
      <table className="styled-table">
        <thead><tr><th>Source</th><th>Open</th><th>Closed</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map(({ name, ch, url }) => (
            <tr key={name}>
              <td><a href={url} target="_blank" rel="noreferrer">{name}</a></td>
              <td>{ch.open.length > 0 ? <a href={url} target="_blank" rel="noreferrer">{ch.open.length}</a> : <span className="text-gray-300">0</span>}</td>
              <td>{ch.closed.length > 0 ? <a href={url} target="_blank" rel="noreferrer">{ch.closed.length}</a> : <span className="text-gray-300">0</span>}</td>
              <td>{ch.tickets.length > 0 ? <a href={url} target="_blank" rel="noreferrer">{ch.tickets.length}</a> : <span className="text-gray-300">0</span>}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>{totO}</strong></td>
            <td><strong>{totC}</strong></td>
            <td><strong style={{ color: "var(--orange)" }}>{totT}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function WeeklyMetrics({ channels, sub }: Props) {
  const get = (n: string): ChannelData => channels[n] || { tickets: [], open: [], closed: [] }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: "var(--orange)" }} />
        <h2 className="text-lg font-extrabold">Weekly Metrics</h2>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <ChannelTable title="Customer Raised Tickets" rows={[
          { name: "AI Bot",              ch: get("AI Bot"),              url: fu(sub, FILTERS["AI Bot"]) },
          { name: "Messaging / Live Chat", ch: get("Messaging/Live Chat"), url: fu(sub, FILTERS["Messaging/Live Chat"]) },
          { name: "Automate Requests",   ch: get("Automate Requests"),   url: fu(sub, FILTERS["Automate Requests"]) },
          { name: "Architect Requests",  ch: get("Architect Requests"),  url: fu(sub, FILTERS["Architect Requests"]) },
          { name: "Tech Tickets",        ch: get("Tech Tickets"),        url: fu(sub, FILTERS["Tech Tickets"]) },
        ]} />
        <ChannelTable title="Internal Teams" rows={[
          { name: "Automate Requests",  ch: get("Automate Requests"),  url: fu(sub, FILTERS["Automate Requests"]) },
          { name: "Architect Requests", ch: get("Architect Requests"), url: fu(sub, FILTERS["Architect Requests"]) },
          { name: "Tech Tickets",       ch: get("Tech Tickets"),       url: fu(sub, FILTERS["Tech Tickets"]) },
          { name: "AI Bot",             ch: get("AI Bot"),             url: fu(sub, FILTERS["AI Bot"]) },
        ]} />
      </div>
    </div>
  )
}
