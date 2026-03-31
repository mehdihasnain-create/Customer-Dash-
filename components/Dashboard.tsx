"use client"
import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { DashboardData, Credentials, ZendeskTicket } from "@/lib/types"
import { getYearWeeks, inWeek } from "@/lib/weekUtils"
import { isOpen, isClosed, isAutomateTicket } from "@/lib/ticketClassifiers"
import { extractCustomer } from "@/lib/dataTransforms"
import StatCards from "./StatCards"
import CategoryPerformance from "./CategoryPerformance"
import WeeklyMetrics from "./WeeklyMetrics"
import InsightsSummary from "./InsightsSummary"
import CustomerList from "./CustomerList"

const WowTrend        = dynamic(() => import("./WowTrend"),        { ssr: false })
const ResolutionChart = dynamic(() => import("./ResolutionChart"),  { ssr: false })
const BreakdownPanel  = dynamic(() => import("./BreakdownPanel"),   { ssr: false })

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  outline:     "rgba(69,70,77,0.15)",
}

function archBuckets(tickets: ZendeskTicket[]) {
  let fn = 0, internal = 0, customer = 0
  for (const t of tickets) {
    const email = (t._requester_email || "").toLowerCase()
    if (email === "architect@klarity.ai") fn++
    else if (email.endsWith("@klaritylaw.com") || email.endsWith("@klarity.ai")) internal++
    else customer++
  }
  return { fn, internal, customer }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Icon({ name, color, size = 20 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, color: color || C.onVariant, lineHeight: 1 }}
    >
      {name}
    </span>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
      style={{
        background: active ? C.high : "transparent",
        color: active ? C.primary : C.onVariant,
        borderRight: active ? `2px solid ${C.primary}` : "2px solid transparent",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.container }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}
    >
      <Icon name={icon} color={active ? C.primary : C.onVariant} />
      {label}
    </button>
  )
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: C.onVariant }}>{label}</span>
        <span style={{ color: "#fff", fontWeight: 700 }}>{value} <span style={{ color: C.onVariant, fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: C.highest }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function HighPriorityList({ tickets, sub }: { tickets: ZendeskTicket[]; sub: string }) {
  if (!tickets.length) return (
    <p className="text-xs p-6" style={{ color: C.onSecondary }}>No high-priority tickets in selected range.</p>
  )
  return (
    <div className="divide-y" style={{ borderColor: C.outline }}>
      {tickets.slice(0, 8).map(t => (
        <a
          key={t.id}
          href={`https://${sub}.zendesk.com/agent/tickets/${t.id}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-4 p-4 transition-colors block"
          style={{ textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.highest)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div className="w-1 rounded-full shrink-0" style={{ height: 40, background: C.error }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: "#fff" }}>
              #{t.id}: {t.subject}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                    style={{ background: "rgba(147,0,10,0.25)", color: C.error }}>
                {t.status}
              </span>
              <span className="text-[10px]" style={{ color: C.onSecondary }}>
                {(t._requester_email || "").split("@")[0] || "—"}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function TopCustomersBar({ tickets }: { tickets: ZendeskTicket[] }) {
  const map: Record<string, number> = {}
  for (const t of tickets) {
    const c = extractCustomer(t)
    map[c] = (map[c] || 0) + 1
  }
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const max = sorted[0]?.[1] || 1

  if (!sorted.length) return <p className="text-xs p-6" style={{ color: C.onSecondary }}>No data.</p>

  return (
    <div className="space-y-3 p-6 pt-0">
      {sorted.map(([name, count]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase w-16 shrink-0 truncate" style={{ color: C.onVariant }}>
            {name}
          </span>
          <div className="flex-1 h-6 rounded relative" style={{ background: C.highest }}>
            <div
              className="h-full rounded transition-all"
              style={{ width: `${Math.round((count / max) * 100)}%`, background: C.primary, opacity: 0.8 }}
            />
            <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-bold" style={{ color: "#fff" }}>
              {count}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-xl overflow-hidden ${className}`} style={{ background: C.container }}>
      {children}
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ background: C.surfaceLow }}>
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#fff" }}>{title}</h3>
      {action}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const today       = new Date()
  const curYear     = today.getFullYear()
  const allWeekDefs = getYearWeeks(curYear)
  const curWeekNum  = allWeekDefs[allWeekDefs.length - 1]?.weekNum ?? 1

  const [creds, setCreds]         = useState<Credentials>({ subdomain: "klarity6695", email: "vikas.k@klaritylaw.com", token: "" })
  const [startWk, setStartWk]     = useState(Math.max(1, curWeekNum - 3))
  const [endWk, setEndWk]         = useState(curWeekNum)
  const [data, setData]           = useState<DashboardData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"architect" | "automate">("architect")
  const [activeSection, setActiveSection] = useState<"overview" | "category" | "customers" | "weekly">("overview")
  const [showConfig, setShowConfig] = useState(false)

  async function generate() {
    if (!creds.email || !creds.token) { setError("Enter email and API token."); return }
    setError(null); setLoading(true)
    const startDate = allWeekDefs.find(w => w.weekNum === startWk)?.start ?? allWeekDefs[0].start
    const endDate   = allWeekDefs.find(w => w.weekNum === endWk)?.end   ?? allWeekDefs[allWeekDefs.length - 1].end
    try {
      const res = await fetch("/api/zendesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, since: startDate, until: endDate }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error === "UNAUTHORIZED" ? "401 Unauthorized — check credentials." : `${json.error}: ${json.message || ""}`)
        return
      }
      setData(json)
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── Architect range ──────────────────────────────────────────────────────
  const displayWeeks = useMemo(
    () => (data?.allWeeks || []).filter(w => w.weekNum >= startWk && w.weekNum <= endWk),
    [data, startWk, endWk]
  )
  const foIds       = useMemo(() => new Set<number>(data?.foIds || []), [data])
  const rangeReal   = useMemo(() => (data?.real || []).filter(t => displayWeeks.some(w => inWeek(t, w))), [data, displayWeeks])
  const rangeOpen   = useMemo(() => rangeReal.filter(isOpen),   [rangeReal])
  const rangeClosed = useMemo(() => rangeReal.filter(isClosed), [rangeReal])
  const rangeRes    = rangeReal.length ? Math.round(rangeClosed.length / rangeReal.length * 100) : 0
  const rangeExcl   = useMemo(() => (data?.excluded || []).filter(t => displayWeeks.some(w => inWeek(t, w))), [data, displayWeeks])
  const wSince = displayWeeks[0]?.start || ""
  const wEnd   = displayWeeks[displayWeeks.length - 1]?.end || ""

  // ── Automate range ───────────────────────────────────────────────────────
  const automateDisplayWeeks = useMemo(
    () => (data?.automateAllWeeks || []).filter(w => w.weekNum >= startWk && w.weekNum <= endWk),
    [data, startWk, endWk]
  )
  const rangeAutomateReal   = useMemo(() => (data?.automateReal || []).filter(t => automateDisplayWeeks.some(w => inWeek(t, w))), [data, automateDisplayWeeks])
  const rangeAutomateOpen   = useMemo(() => rangeAutomateReal.filter(isOpen),   [rangeAutomateReal])
  const rangeAutomateClosed = useMemo(() => rangeAutomateReal.filter(isClosed), [rangeAutomateReal])
  const rangeAutomateRes    = rangeAutomateReal.length ? Math.round(rangeAutomateClosed.length / rangeAutomateReal.length * 100) : 0
  const rangeAutomateExcl   = useMemo(() => (data?.excluded || []).filter(t => isAutomateTicket(t) && automateDisplayWeeks.some(w => inWeek(t, w))), [data, automateDisplayWeeks])

  // ── Active tab helpers ───────────────────────────────────────────────────
  const activeReal    = activeTab === "architect" ? rangeReal    : rangeAutomateReal
  const activeOpen    = activeTab === "architect" ? rangeOpen    : rangeAutomateOpen
  const activeClosed  = activeTab === "architect" ? rangeClosed  : rangeAutomateClosed
  const activeRes     = activeTab === "architect" ? rangeRes     : rangeAutomateRes
  const activeExcl    = activeTab === "architect" ? rangeExcl    : rangeAutomateExcl
  const activeCatPerf = activeTab === "architect" ? data?.catPerf || [] : data?.automateCatPerf || []
  const activeWeeks   = activeTab === "architect" ? displayWeeks : automateDisplayWeeks
  const archTickets   = data?.channels["Architect Requests"]?.tickets || []
  const buckets       = useMemo(() => archBuckets(archTickets), [archTickets])
  const highPri       = data?.channels["High Priority"]?.tickets || []

  const weekLabel = allWeekDefs.find(w => w.weekNum === startWk)?.display?.split("-")[0]?.trim() || ""
  const weekLabelEnd = allWeekDefs.find(w => w.weekNum === endWk)?.display?.split("-")[1]?.trim() || ""

  // WoW delta: last week vs second-to-last week in selected range
  const wowDelta = useMemo(() => {
    if (activeWeeks.length < 2) return null
    const last = activeWeeks[activeWeeks.length - 1].count
    const prev = activeWeeks[activeWeeks.length - 2].count
    if (prev === 0) return null
    return Math.round(((last - prev) / prev) * 100)
  }, [activeWeeks])

  // Stale open: open tickets created >48h ago
  const staleOpen = useMemo(() => {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    return activeOpen.filter(t => t.created_at < cutoff).length
  }, [activeOpen])

  return (
    <div className="flex min-h-screen" style={{ background: C.surface }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
             style={{ background: C.surfaceLow, boxShadow: "10px 0 40px rgba(6,14,32,0.5)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.primary }}>
            <Icon name="insights" color={C.surface} size={18} />
          </div>
          <div>
            <h1 className="text-base font-black leading-none" style={{ color: "#fff" }}>Klarity CX</h1>
            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: C.onSecondary }}>Precision Intelligence</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          <NavItem icon="dashboard"    label="Overview"           active={activeSection === "overview"}  onClick={() => { setActiveSection("overview"); window.scrollTo({ top: 0, behavior: "smooth" }) }} />
          <NavItem icon="architecture" label="Architect Product"  active={activeTab === "architect" && activeSection === "overview"} onClick={() => { setActiveTab("architect"); setActiveSection("overview"); window.scrollTo({ top: 0, behavior: "smooth" }) }} />
          <NavItem icon="smart_toy"    label="Automate Product"   active={activeTab === "automate"}  onClick={() => { setActiveTab("automate"); setActiveSection("overview"); window.scrollTo({ top: 0, behavior: "smooth" }) }} />
          <NavItem icon="category"     label="Category Performance" active={activeSection === "category"} onClick={() => { setActiveSection("category"); document.getElementById("section-category")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
          <NavItem icon="groups"       label="Top Customers"      active={activeSection === "customers"} onClick={() => { setActiveSection("customers"); document.getElementById("section-customers")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
          <NavItem icon="table_rows"   label="Weekly Metrics"     active={activeSection === "weekly"}    onClick={() => { setActiveSection("weekly"); document.getElementById("section-weekly")?.scrollIntoView({ behavior: "smooth", block: "start" }) }} />
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pt-3 pb-2" style={{ borderTop: `1px solid ${C.outline}` }}>
          <button
            onClick={() => setShowConfig(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
            style={{ color: C.onVariant }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = C.onVariant)}
          >
            <Icon name="settings" />
            <span>API Config</span>
            <Icon name={showConfig ? "expand_less" : "expand_more"} size={16} />
          </button>

          {showConfig && (
            <div className="mt-2 flex flex-col gap-2 px-1">
              {error && (
                <p className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(147,0,10,0.3)", color: "#ffdad6" }}>{error}</p>
              )}
              <input
                className="w-full rounded px-2.5 py-1.5 text-xs"
                style={{ background: C.lowest, color: C.onSurface, border: "none", outline: "none" }}
                placeholder="Email"
                value={creds.email}
                onChange={e => setCreds(c => ({ ...c, email: e.target.value }))}
              />
              <input
                className="w-full rounded px-2.5 py-1.5 text-xs"
                style={{ background: C.lowest, color: C.onSurface, border: "none", outline: "none" }}
                placeholder="API Token"
                type="password"
                value={creds.token}
                onChange={e => setCreds(c => ({ ...c, token: e.target.value }))}
              />
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "This Wk",  s: curWeekNum,              e: curWeekNum },
                  { label: "4 Wks",    s: Math.max(1, curWeekNum - 3), e: curWeekNum },
                  { label: "8 Wks",    s: Math.max(1, curWeekNum - 7), e: curWeekNum },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { setStartWk(p.s); setEndWk(p.e) }}
                    className="rounded py-1 text-[10px] font-semibold transition-colors"
                    style={{
                      background: startWk === p.s && endWk === p.e ? C.primary : C.high,
                      color: startWk === p.s && endWk === p.e ? C.surface : C.onVariant,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <select className="rounded px-2 py-1.5 text-xs" style={{ background: C.lowest, color: C.onSurface, border: "none" }}
                        value={startWk} onChange={e => setStartWk(Number(e.target.value))}>
                  {allWeekDefs.map(w => <option key={w.weekNum} value={w.weekNum} style={{ background: C.highest }}>{w.label}</option>)}
                </select>
                <select className="rounded px-2 py-1.5 text-xs" style={{ background: C.lowest, color: C.onSurface, border: "none" }}
                        value={endWk} onChange={e => setEndWk(Number(e.target.value))}>
                  {allWeekDefs.map(w => <option key={w.weekNum} value={w.weekNum} style={{ background: C.highest }}>{w.label}</option>)}
                </select>
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="w-full py-2 rounded text-xs font-bold transition-opacity disabled:opacity-50"
                style={{ background: `linear-gradient(15deg, ${C.primary}, ${C.container})`, color: C.surface }}
              >
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col" style={{ marginLeft: 256, minHeight: "100vh" }}>

        {/* Top app bar */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-8 py-3"
                style={{ background: "rgba(11,19,38,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.outline}` }}>
          <div className="flex items-center gap-6">
            {/* Week pill */}
            <div className="flex items-center gap-2 rounded px-3 py-1.5"
                 style={{ background: C.container, border: `1px solid ${C.outline}` }}>
              <Icon name="calendar_month" color={C.primary} size={16} />
              <span className="text-xs font-medium" style={{ color: C.onVariant }}>
                {data ? `Wk ${startWk} → Wk ${endWk}` : "Select week range"}
              </span>
              {data && (
                <span className="text-[10px]" style={{ color: C.onSecondary }}>
                  · {weekLabel} – {weekLabelEnd}
                </span>
              )}
            </div>
            {/* Product tabs */}
            <nav className="flex items-center gap-5">
              {(["architect", "automate"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="text-sm font-semibold capitalize transition-all pb-1"
                  style={{
                    color: activeTab === tab ? C.primary : C.onVariant,
                    borderBottom: activeTab === tab ? `2px solid ${C.primary}` : "2px solid transparent",
                  }}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
          {/* Right: actions + user */}
          <div className="flex items-center gap-3">
            {!data && !loading && (
              <button
                onClick={() => setShowConfig(true)}
                className="text-xs px-3 py-1.5 rounded font-semibold"
                style={{ background: `linear-gradient(15deg, ${C.primary}, ${C.container})`, color: C.surface }}
              >
                Connect Zendesk
              </button>
            )}
            {loading && (
              <span className="text-xs" style={{ color: C.onSecondary }}>Fetching from Zendesk...</span>
            )}
            {data && !loading && (
              <button onClick={generate} className="flex items-center gap-1 text-xs rounded px-2.5 py-1.5 font-medium transition-colors"
                      style={{ background: C.container, color: C.onVariant }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.high)}
                      onMouseLeave={e => (e.currentTarget.style.background = C.container)}>
                <Icon name="refresh" size={14} />
                Refresh
              </button>
            )}
            <div style={{ width: 1, height: 24, background: C.outline }} />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-bold" style={{ color: "#fff" }}>Ops Lead</p>
                <p className="text-[10px]" style={{ color: C.onSecondary }}>{creds.subdomain}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: C.container, border: `1px solid rgba(137,206,255,0.2)` }}>
                <Icon name="account_circle" color={C.primary} size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: C.container }}>
                <Icon name="insights" color={C.primary} size={32} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: "#fff" }}>Connect to Zendesk</h2>
              <p className="text-sm mb-4" style={{ color: C.onSecondary }}>Open API Config in the sidebar to enter your credentials.</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <section className="p-8 flex flex-col gap-8">

            {/* ── Row 1: KPI Cards ──────────────────────────────────────── */}
            <StatCards
              rangeReal={activeReal} rangeOpen={activeOpen} rangeClosed={activeClosed}
              rangeRes={activeRes} unsolved={data.unsolvedTickets}
              highPriority={highPri}
              foIds={foIds} foCount={data.foCount} rangeExcl={activeExcl}
              sub={creds.subdomain} wSince={wSince} wEnd={wEnd}
              startWk={startWk} endWk={endWk}
              wowDelta={wowDelta} staleOpen={staleOpen}
            />

            {/* Failed ops info bar */}
            <div className="flex items-center gap-2 rounded-lg px-4 py-2.5" style={{ background: C.surfaceLow, border: `1px solid ${C.outline}` }}>
              <Icon name="info" color={C.error} size={16} />
              <p className="text-xs italic" style={{ color: C.onVariant }}>
                Failed Operations view ({data.foCount} tickets) excluded from every metric for data integrity.{" "}
                <a href={`https://${creds.subdomain}.zendesk.com/agent/filters/17237919534108`} target="_blank" rel="noreferrer"
                   style={{ color: C.primary }}>View bucket ↗</a>
              </p>
            </div>

            {/* ── AI Executive Briefing ─────────────────────────────────── */}
            <InsightsSummary key={activeTab}
              product={activeTab}
              weekRange={`Wk ${startWk}–${endWk} (${weekLabel} – ${weekLabelEnd})`}
              rangeReal={activeReal}
              rangeOpen={activeOpen}
              rangeClosed={activeClosed}
              resolutionRate={activeRes}
              catPerf={activeCatPerf}
              displayWeeks={activeWeeks}
              foCount={data.foCount}
              archBuckets={activeTab === "architect" ? buckets : undefined}
              wowDelta={wowDelta}
              staleOpen={staleOpen}
            />

            {/* ── Row 2: Volume Trend (2/3) + Breakdown (1/3) ──────────── */}
            <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
              <Card>
                <CardHeader title="Weekly Volume Trend" />
                <div className="p-6">
                  <WowTrend displayWeeks={activeWeeks} sub={creds.subdomain} startWk={startWk} endWk={endWk} />
                </div>
              </Card>

              <Card>
                <CardHeader title={activeTab === "architect" ? "Architect Breakdown" : "Automate Breakdown"} />
                <div className="p-6 flex flex-col gap-6">
                  {activeTab === "architect" ? (
                    <>
                      <ProgressBar label="Failure Notifications" value={buckets.fn}       max={archTickets.length} color={C.error} />
                      <ProgressBar label="Internal Requests"     value={buckets.internal}  max={archTickets.length} color={C.primary} />
                      <ProgressBar label="Customer Tickets"      value={buckets.customer}  max={archTickets.length} color={C.tertiary} />
                      <div className="rounded-lg p-3 mt-2" style={{ background: C.surfaceLow, border: `1px solid ${C.outline}` }}>
                        <p className="text-[10px] leading-relaxed" style={{ color: C.onSecondary }}>
                          <span style={{ color: C.primary, fontWeight: 700 }}>STRATEGY:</span>{" "}
                          {buckets.fn > buckets.customer
                            ? "Failure notifications are driving majority volume. Automated trigger optimization recommended."
                            : "Customer tickets are the primary volume driver this period."}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ProgressBar label="Open"   value={rangeAutomateOpen.length}   max={rangeAutomateReal.length} color={C.error} />
                      <ProgressBar label="Solved"  value={rangeAutomateClosed.length} max={rangeAutomateReal.length} color={C.tertiary} />
                      <div className="rounded-lg p-3 mt-2" style={{ background: C.surfaceLow, border: `1px solid ${C.outline}` }}>
                        <p className="text-[10px] leading-relaxed" style={{ color: C.onSecondary }}>
                          <span style={{ color: C.tertiary, fontWeight: 700 }}>AUTOMATE:</span>{" "}
                          {rangeAutomateRes}% resolution rate over selected period.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>

            {/* ── Row 3: Category Performance (full width) ─────────────── */}
            <Card id="section-category">
              <CardHeader title="Category Performance — Last 4 Weeks" />
              <CategoryPerformance catPerf={activeCatPerf} sub={creds.subdomain} />
            </Card>

            {/* ── Row 4: Customer Intelligence (full width) ────────────── */}
            <Card id="section-customers">
              <CardHeader
                title="Customer Intelligence"
                action={
                  <span className="text-[9px] px-2 py-1 rounded font-bold uppercase"
                        style={{ background: "rgba(137,206,255,0.1)", color: C.primary }}>
                    Signal 1–6 extraction
                  </span>
                }
              />
              <CustomerList tickets={activeReal} catPerf={activeCatPerf} sub={creds.subdomain} />
            </Card>

            {/* ── Row 4: Status Donut (1/3) + High Priority (2/3) ──────── */}
            <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
              <Card>
                <CardHeader title="Status Distribution" />
                <div className="p-6">
                  <BreakdownPanel
                    rangeReal={activeReal} rangeOpen={activeOpen} rangeClosed={activeClosed}
                    sub={creds.subdomain} wSince={wSince} wEnd={wEnd} startWk={startWk} endWk={endWk}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Recent High Priority"
                  action={<span className="text-[10px] px-2 py-1 rounded" style={{ background: C.container, color: C.onSecondary }}>View: 23645136614684</span>}
                />
                <HighPriorityList tickets={highPri} sub={creds.subdomain} />
              </Card>
            </div>

            {/* ── Row 5: Resolution Chart (full) ───────────────────────── */}
            <Card>
              <CardHeader title="Resolution Time by Category" />
              <div className="p-6">
                <ResolutionChart catPerf={activeCatPerf} />
              </div>
            </Card>

            {/* ── Row 6: Weekly Metrics Channel Tables ─────────────────── */}
            <Card id="section-weekly">
              <CardHeader title="Weekly Channel Metrics" />
              <div className="p-6">
                <WeeklyMetrics channels={data.channels} sub={creds.subdomain} mode={activeTab} />
              </div>
            </Card>

          </section>
        )}

        {/* Footer */}
        <footer className="mt-auto px-8 py-4 flex justify-between items-center"
                style={{ borderTop: `1px solid ${C.outline}` }}>
          <div className="flex gap-4 text-[10px] uppercase tracking-wider" style={{ color: C.onSecondary }}>
            <span>© {curYear} Klarity CX Operations Dashboard · v8</span>
            <span style={{ color: C.tertiary }}>· Data refreshed live from Zendesk</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.onSecondary }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.tertiary, display: "inline-block" }} />
            <a href={`https://${creds.subdomain}.zendesk.com/agent`} target="_blank" rel="noreferrer"
               style={{ color: C.onSecondary }} className="hover:text-white transition-colors">
              System Status: {data ? "Live" : "Standby"}
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
