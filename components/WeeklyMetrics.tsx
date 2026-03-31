import { ChannelData } from "@/lib/types"
import { FILTERS } from "@/lib/constants"

interface Props {
  channels: Record<string, ChannelData>
  sub: string
  mode?: "architect" | "automate"
}

const C = {
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  error:       "#ffb4ab",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  outline:     "rgba(69,70,77,0.15)",
}

function fu(sub: string, fid: string) { return `https://${sub}.zendesk.com/agent/filters/${fid}` }

function ChannelTable({ title, rows }: { title: string; rows: { name: string; ch: ChannelData; url: string }[] }) {
  const totO = rows.reduce((s, r) => s + r.ch.open.length, 0)
  const totC = rows.reduce((s, r) => s + r.ch.closed.length, 0)
  const totT = rows.reduce((s, r) => s + r.ch.tickets.length, 0)

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.onSecondary }}>{title}</p>
      <table className="channel-table">
        <thead><tr><th>Source</th><th>Open</th><th>Closed</th><th>Total</th></tr></thead>
        <tbody>
          {rows.map(({ name, ch, url }) => (
            <tr key={name}>
              <td><a href={url} target="_blank" rel="noreferrer">{name}</a></td>
              <td style={{ color: ch.open.length > 0 ? C.error : "rgba(69,70,77,0.8)" }}>
                {ch.open.length > 0
                  ? <a href={url} target="_blank" rel="noreferrer" style={{ color: C.error }}>{ch.open.length}</a>
                  : "0"}
              </td>
              <td>
                {ch.closed.length > 0
                  ? <a href={url} target="_blank" rel="noreferrer" style={{ color: C.tertiary }}>{ch.closed.length}</a>
                  : <span style={{ color: "rgba(69,70,77,0.8)" }}>0</span>}
              </td>
              <td>
                {ch.tickets.length > 0
                  ? <a href={url} target="_blank" rel="noreferrer">{ch.tickets.length}</a>
                  : <span style={{ color: "rgba(69,70,77,0.8)" }}>0</span>}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong style={{ color: C.error }}>{totO}</strong></td>
            <td><strong style={{ color: C.tertiary }}>{totC}</strong></td>
            <td><strong style={{ color: C.primary }}>{totT}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function WeeklyMetrics({ channels, sub, mode = "architect" }: Props) {
  const get = (n: string): ChannelData => channels[n] || { tickets: [], open: [], closed: [] }

  return (
    <div className="grid grid-cols-2 gap-8">
      {mode === "architect" ? (
        <>
          <ChannelTable title="Customer Raised Tickets" rows={[
            { name: "AI Bot",               ch: get("AI Bot"),              url: fu(sub, FILTERS["AI Bot"]) },
            { name: "Messaging / Live Chat", ch: get("Messaging/Live Chat"), url: fu(sub, FILTERS["Messaging/Live Chat"]) },
            { name: "Architect Requests",   ch: get("Architect Requests"),  url: fu(sub, FILTERS["Architect Requests"]) },
            { name: "Tech Tickets",         ch: get("Tech Tickets"),        url: fu(sub, FILTERS["Tech Tickets"]) },
          ]} />
          <ChannelTable title="Internal Teams" rows={[
            { name: "Architect Requests", ch: get("Architect Requests"), url: fu(sub, FILTERS["Architect Requests"]) },
            { name: "Tech Tickets",       ch: get("Tech Tickets"),       url: fu(sub, FILTERS["Tech Tickets"]) },
            { name: "AI Bot",             ch: get("AI Bot"),             url: fu(sub, FILTERS["AI Bot"]) },
          ]} />
        </>
      ) : (
        <>
          <ChannelTable title="Customer Raised Tickets" rows={[
            { name: "Automate Requests", ch: get("Automate Requests"), url: fu(sub, FILTERS["Automate Requests"]) },
          ]} />
          <ChannelTable title="Internal Teams" rows={[
            { name: "Automate Requests", ch: get("Automate Requests"), url: fu(sub, FILTERS["Automate Requests"]) },
          ]} />
        </>
      )}
    </div>
  )
}
