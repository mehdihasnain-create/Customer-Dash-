"use client"
import { useState } from "react"
import { ZendeskTicket } from "@/lib/types"
import { checkExclusion } from "@/lib/ticketClassifiers"
import { extractCustomer } from "@/lib/dataTransforms"
import { FILTERS } from "@/lib/constants"

interface StatCardProps {
  label: string
  value: string | number
  sub: string
  url: string
  variant?: "default" | "good" | "alert"
  tickets?: ZendeskTicket[]
  foIds?: Set<number>
  subdomain?: string
}

function StatCard({ label, value, sub, url, variant = "default", tickets, foIds, subdomain }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const borderColor = variant === "good" ? "#2a9d8f" : variant === "alert" ? "#e63946" : "#eee"
  const valueColor  = variant === "good" ? "#2a9d8f" : variant === "alert" ? "#e63946" : "#E8612C"

  return (
    <div className="flex flex-col gap-2">
      <a href={url} target="_blank" rel="noreferrer"
         className="block rounded-xl p-4 bg-white transition-shadow hover:shadow-md"
         style={{ border: `1.5px solid ${borderColor}` }}>
        <div className="text-xs font-semibold text-gray-400 mb-1">{label}</div>
        <div className="text-4xl font-extrabold leading-tight" style={{ color: valueColor }}>{value}</div>
        <div className="text-xs text-gray-400 mt-1">{sub} ↗</div>
      </a>
      {tickets && foIds && subdomain && (
        <>
          <button
            onClick={() => setOpen(true)}
            className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: "var(--dark)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--orange)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--dark)")}
          >
            🔍 Audit ({tickets.length})
          </button>
          {open && (
            <AuditModal title={label} tickets={tickets} foIds={foIds} sub={subdomain} onClose={() => setOpen(false)} />
          )}
        </>
      )}
    </div>
  )
}

function AuditModal({ title, tickets, foIds, sub, onClose }: {
  title: string; tickets: ZendeskTicket[]; foIds: Set<number>; sub: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-lg">{title} — {tickets.length} tickets</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
        </div>
        <div className="overflow-auto flex-1 p-5">
          <table className="styled-table">
            <thead><tr>
              <th>ID</th><th>Subject</th><th>Customer</th><th>Status</th><th>Requester</th><th>Included?</th><th>Reason</th>
            </tr></thead>
            <tbody>
              {tickets.map(t => {
                const { excluded, reason } = checkExclusion(t, foIds)
                return (
                  <tr key={t.id}>
                    <td><a href={`https://${sub}.zendesk.com/agent/tickets/${t.id}`} target="_blank" rel="noreferrer">{t.id}</a></td>
                    <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</td>
                    <td>{extractCustomer(t)}</td>
                    <td><span className="uppercase text-xs font-bold">{t.status}</span></td>
                    <td>{t._requester_email || "—"}</td>
                    <td style={{ color: excluded ? "#e63946" : "#2a9d8f", fontWeight: 700 }}>{excluded ? "No" : "Yes"}</td>
                    <td className="text-xs text-gray-500">{excluded ? reason : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface Props {
  rangeReal: ZendeskTicket[]; rangeOpen: ZendeskTicket[]; rangeClosed: ZendeskTicket[]
  rangeRes: number; unsolved: ZendeskTicket[]; highPriority: ZendeskTicket[]
  foIds: Set<number>; foCount: number; rangeExcl: ZendeskTicket[]
  sub: string; wSince: string; wEnd: string; startWk: number; endWk: number
}

function su(sub: string, q: string) { return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}` }
function fu(sub: string, fid: string) { return `https://${sub}.zendesk.com/agent/filters/${fid}` }

export default function StatCards({ rangeReal, rangeOpen, rangeClosed, rangeRes, unsolved, highPriority, foIds, foCount, rangeExcl, sub, wSince, wEnd, startWk, endWk }: Props) {
  const [auditExcl, setAuditExcl] = useState(false)

  return (
    <div>
      <div className="grid grid-cols-6 gap-4">
        <StatCard label="Tickets Received" value={rangeReal.length}
          sub={`Wk ${startWk} - Wk ${endWk}`}
          url={su(sub, `type:ticket created>${wSince} created<${wEnd} -status:new`)}
          tickets={rangeReal} foIds={foIds} subdomain={sub} />
        <StatCard label="Open" value={rangeOpen.length}
          sub={`${100 - rangeRes}% of total`}
          url={su(sub, `type:ticket status:open OR status:pending created>${wSince}`)}
          tickets={rangeOpen} foIds={foIds} subdomain={sub} />
        <StatCard label="Solved / Closed" value={rangeClosed.length}
          sub={`${rangeRes}% resolution`}
          url={su(sub, `type:ticket status:solved OR status:closed created>${wSince}`)}
          tickets={rangeClosed} foIds={foIds} subdomain={sub} />
        <StatCard label="Resolution Rate" value={`${rangeRes}%`}
          sub={`${rangeClosed.length} of ${rangeReal.length} resolved`}
          url={su(sub, `type:ticket status:solved created>${wSince}`)}
          variant={rangeRes >= 70 ? "good" : "alert"} />
        <StatCard label="Unsolved in Group" value={unsolved.length}
          sub="Failed Ops excluded"
          url={fu(sub, FILTERS["All Open"])}
          variant={unsolved.length > 50 ? "alert" : "default"}
          tickets={unsolved} foIds={foIds} subdomain={sub} />
        <StatCard label="High Priority" value={highPriority.length}
          sub="View filter"
          url={fu(sub, FILTERS["High Priority"])}
          tickets={highPriority} foIds={foIds} subdomain={sub} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Failed Operations view ({foCount} tickets) excluded from every metric.{" "}
          <a href={fu(sub, FILTERS["Failed Operations"])} target="_blank" rel="noreferrer"
             style={{ color: "var(--orange)" }}>View bucket ↗</a>
        </p>
        <button
          onClick={() => setAuditExcl(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
          style={{ background: "var(--dark)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--orange)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--dark)")}
        >
          🔍 Audit Excluded ({rangeExcl.length})
        </button>
      </div>
      {auditExcl && (
        <AuditModal title="Excluded Tickets" tickets={rangeExcl} foIds={foIds} sub={sub} onClose={() => setAuditExcl(false)} />
      )}
    </div>
  )
}
