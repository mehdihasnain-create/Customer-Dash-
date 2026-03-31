"use client"
import { useState } from "react"
import { ZendeskTicket } from "@/lib/types"
import { checkExclusion } from "@/lib/ticketClassifiers"
import { extractCustomer } from "@/lib/dataTransforms"
import { FILTERS } from "@/lib/constants"

const C = {
  surface:     "#0b1326",
  surfaceLow:  "#131b2e",
  container:   "#171f33",
  high:        "#222a3d",
  highest:     "#2d3449",
  lowest:      "#060e20",
  onSurface:   "#dae2fd",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  error:       "#ffb4ab",
  errContainer:"#93000a",
  outline:     "rgba(69,70,77,0.15)",
}

function Icon({ name, color, size = 20 }: { name: string; color?: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, color: color || C.onVariant, lineHeight: 1 }}>
      {name}
    </span>
  )
}

function AuditModal({ title, tickets, foIds, sub, onClose }: {
  title: string; tickets: ZendeskTicket[]; foIds: Set<number>; sub: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: "rgba(6,14,32,0.85)", backdropFilter: "blur(4px)" }}
         onClick={onClose}>
      <div className="rounded-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
           style={{ background: C.highest, boxShadow: "0 10px 40px rgba(6,14,32,0.8)", border: `1px solid ${C.outline}` }}
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${C.outline}` }}>
          <h3 className="font-bold text-sm" style={{ color: "#fff" }}>{title} — {tickets.length} tickets</h3>
          <button onClick={onClose} className="text-xl font-bold" style={{ color: C.onVariant }}>×</button>
        </div>
        <div className="overflow-auto flex-1 p-5">
          <table className="data-table">
            <thead><tr>
              <th>ID</th><th>Subject</th><th>Customer</th><th>Status</th><th>Requester</th><th>Included?</th>
            </tr></thead>
            <tbody>
              {tickets.map(t => {
                const { excluded, reason } = checkExclusion(t, foIds)
                const statusColor = t.status === "solved" || t.status === "closed" ? C.tertiary : t.status === "open" ? C.error : C.onVariant
                return (
                  <tr key={t.id}>
                    <td style={{ textAlign: "left" }}>
                      <a href={`https://${sub}.zendesk.com/agent/tickets/${t.id}`} target="_blank" rel="noreferrer">{t.id}</a>
                    </td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", fontWeight: 400, color: C.onVariant }}>
                      {t.subject}
                    </td>
                    <td style={{ textAlign: "left", fontWeight: 400, color: C.onVariant }}>{extractCustomer(t)}</td>
                    <td><span style={{ color: statusColor, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>{t.status}</span></td>
                    <td style={{ fontWeight: 400, color: C.onSecondary, fontSize: 11 }}>{t._requester_email || "—"}</td>
                    <td style={{ color: excluded ? C.error : C.tertiary, fontWeight: 700 }}
                        title={excluded ? reason : undefined}>
                      {excluded ? "No" : "Yes"}
                    </td>
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

interface KpiCardProps {
  label: string; value: string | number; sub: string
  icon: string; iconBg: string; iconColor: string
  url: string; trend?: { value: string; positive: boolean }
  variant?: "default" | "good" | "alert"
  progress?: number
  tickets?: ZendeskTicket[]; foIds?: Set<number>; subdomain?: string
}

function KpiCard({ label, value, sub, icon, iconBg, iconColor, url, trend, variant, progress, tickets, foIds, subdomain }: KpiCardProps) {
  const [open, setOpen] = useState(false)
  const valueColor = variant === "good" ? C.tertiary : variant === "alert" ? C.error : "#fff"

  return (
    <div className="relative overflow-hidden rounded-xl flex flex-col"
         style={{ background: C.container, border: `1px solid ${C.outline}`, padding: "1.5rem" }}>

      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.onSecondary }}>{label}</span>
        <div className="p-2 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon name={icon} color={iconColor} size={20} />
        </div>
      </div>

      {/* Value + trend */}
      <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight" style={{ color: valueColor, letterSpacing: "-0.02em" }}>
            {value}
          </span>
          {trend && (
            <span className="flex items-center gap-0.5 text-xs font-medium"
                  style={{ color: trend.positive ? C.tertiary : C.error }}>
              <Icon name={trend.positive ? "trending_up" : "trending_down"} color={trend.positive ? C.tertiary : C.error} size={14} />
              {trend.value}
            </span>
          )}
          {variant === "good" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(60,221,199,0.15)", color: C.tertiary }}>
              TARGET MET
            </span>
          )}
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: C.onVariant }}>{sub}</p>
      </a>

      {/* Progress bar (for rate card) */}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: C.highest }}>
          <div className="h-full" style={{
            width: `${progress}%`,
            background: `linear-gradient(to right, ${C.primary}, ${C.tertiary})`
          }} />
        </div>
      )}

      {/* Audit button */}
      {tickets && foIds && subdomain && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full py-1.5 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
          style={{ background: C.high, color: C.onVariant }}
          onMouseEnter={e => (e.currentTarget.style.background = C.highest)}
          onMouseLeave={e => (e.currentTarget.style.background = C.high)}
        >
          <Icon name="manage_search" size={13} />
          Audit ({tickets.length})
        </button>
      )}
      {open && tickets && foIds && subdomain && (
        <AuditModal title={label} tickets={tickets} foIds={foIds} sub={subdomain} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

interface Props {
  rangeReal: ZendeskTicket[]; rangeOpen: ZendeskTicket[]; rangeClosed: ZendeskTicket[]
  rangeRes: number; unsolved: ZendeskTicket[]; highPriority: ZendeskTicket[]
  foIds: Set<number>; foCount: number; rangeExcl: ZendeskTicket[]
  sub: string; wSince: string; wEnd: string; startWk: number; endWk: number
  wowDelta?: number | null; staleOpen?: number
}

function su(sub: string, q: string) { return `https://${sub}.zendesk.com/agent/search?q=${encodeURIComponent(q)}` }
function fu(sub: string, fid: string) { return `https://${sub}.zendesk.com/agent/filters/${fid}` }

export default function StatCards({ rangeReal, rangeOpen, rangeClosed, rangeRes, unsolved, highPriority, foIds, foCount, rangeExcl, sub, wSince, wEnd, startWk, endWk, wowDelta, staleOpen = 0 }: Props) {
  const [auditExcl, setAuditExcl] = useState(false)

  const wowTrend = wowDelta !== null && wowDelta !== undefined
    ? { value: `${Math.abs(wowDelta)}% WoW`, positive: wowDelta < 0 }
    : undefined

  return (
    <div>
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <KpiCard
          label="Received" value={rangeReal.length}
          sub={wowDelta !== null && wowDelta !== undefined
            ? `${wowDelta > 0 ? "▲" : wowDelta < 0 ? "▼" : "—"} ${Math.abs(wowDelta ?? 0)}% vs prior week`
            : "tickets in range"}
          icon="move_to_inbox" iconBg="rgba(137,206,255,0.1)" iconColor={C.primary}
          url={su(sub, `type:ticket created>${wSince} created<${wEnd} -status:new`)}
          trend={wowTrend}
          tickets={rangeReal} foIds={foIds} subdomain={sub}
        />
        <KpiCard
          label="Active Work" value={rangeOpen.length}
          sub={staleOpen > 0 ? `${staleOpen} stale >48h — needs action` : "All within SLA"}
          icon="pending_actions" iconBg="rgba(255,180,171,0.1)" iconColor={C.error}
          url={su(sub, `type:ticket status:open OR status:pending created>${wSince}`)}
          variant={staleOpen > 3 ? "alert" : undefined}
          tickets={rangeOpen} foIds={foIds} subdomain={sub}
        />
        <KpiCard
          label="Solved" value={rangeClosed.length}
          sub={rangeReal.length > 0 ? `${Math.round((rangeClosed.length / rangeReal.length) * 100)}% of received` : "No tickets"}
          icon="task_alt" iconBg="rgba(60,221,199,0.1)" iconColor={C.tertiary}
          url={su(sub, `type:ticket status:solved OR status:closed created>${wSince}`)}
          tickets={rangeClosed} foIds={foIds} subdomain={sub}
        />
        <KpiCard
          label="Solved Rate" value={`${rangeRes}%`}
          sub={rangeRes >= 70 ? "Exceeding 70% baseline" : "Below 70% target — investigate"}
          icon="percent" iconBg="rgba(137,206,255,0.1)" iconColor={C.primary}
          url={su(sub, `type:ticket status:solved created>${wSince}`)}
          variant={rangeRes >= 70 ? "good" : "alert"}
          progress={rangeRes}
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px]" style={{ color: C.onSecondary }}>
          {foCount} Failed Operations tickets excluded · Wk {startWk}–{endWk}
        </p>
        <button
          onClick={() => setAuditExcl(true)}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded font-semibold transition-colors"
          style={{ background: C.container, color: C.onVariant }}
          onMouseEnter={e => (e.currentTarget.style.background = C.high)}
          onMouseLeave={e => (e.currentTarget.style.background = C.container)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13, lineHeight: 1 }}>manage_search</span>
          Audit Excluded ({rangeExcl.length})
        </button>
      </div>
      {auditExcl && (
        <AuditModal title="Excluded Tickets" tickets={rangeExcl} foIds={foIds} sub={sub} onClose={() => setAuditExcl(false)} />
      )}
    </div>
  )
}
