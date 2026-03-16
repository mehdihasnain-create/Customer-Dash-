"use client"
import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { DashboardData, Credentials } from "@/lib/types"
import { getYearWeeks, inWeek } from "@/lib/weekUtils"
import { isOpen, isClosed } from "@/lib/ticketClassifiers"
import CredentialsForm from "./CredentialsForm"
import StatCards from "./StatCards"
import WeeklyMetrics from "./WeeklyMetrics"
import CategoryPerformance from "./CategoryPerformance"

const WowTrend        = dynamic(() => import("./WowTrend"),        { ssr: false })
const ResolutionChart = dynamic(() => import("./ResolutionChart"),  { ssr: false })
const BreakdownPanel  = dynamic(() => import("./BreakdownPanel"),   { ssr: false })

export default function Dashboard() {
  const today    = new Date()
  const curYear  = today.getFullYear()
  const allWeekDefs = getYearWeeks(curYear)
  const curWeekNum  = allWeekDefs.length

  const [creds, setCreds]         = useState<Credentials>({ subdomain: "klarity6695", email: "vikas.k@klaritylaw.com", token: "" })
  const [startWk, setStartWk]     = useState(Math.max(1, curWeekNum - 3))
  const [endWk, setEndWk]         = useState(curWeekNum)
  const [data, setData]           = useState<DashboardData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function generate() {
    if (!creds.email || !creds.token) { setError("Enter email and API token."); return }
    if (startWk > endWk) { setError("Start week must be ≤ end week."); return }
    setError(null); setLoading(true)
    const [startDate] = allWeekDefs.find(w => w.weekNum === startWk)
      ? [allWeekDefs.find(w => w.weekNum === startWk)!.start] : [allWeekDefs[0].start]

    try {
      const res = await fetch("/api/zendesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, since: startDate }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error === "UNAUTHORIZED" ? "401 Unauthorized — check email and API token." : `Error: ${json.error}`)
        return
      }
      setData(json)
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 sticky top-0 h-screen overflow-y-auto p-5 flex flex-col gap-4"
             style={{ background: "var(--dark)" }}>
        <h2 className="text-white font-bold text-lg">Klarity Support</h2>
        <hr className="border-white/20" />
        <CredentialsForm
          creds={creds} onCreds={setCreds}
          startWk={startWk} endWk={endWk} allWeeks={allWeekDefs}
          onStartWk={setStartWk} onEndWk={setEndWk}
          onGenerate={generate} loading={loading}
        />
        <hr className="border-white/20" />
        <p className="text-white/40 text-xs">
          Wk {startWk} → Wk {endWk}<br/>
          Failed Ops excluded from all counts
        </p>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: "var(--dark)" }}>
              Support Performance Report
            </h1>
            <span className="inline-block mt-2 text-xs font-bold text-white rounded-full px-3 py-1"
                  style={{ background: "var(--dark)" }}>
              Week {startWk} to Week {endWk} &nbsp;|&nbsp; {today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Generated {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm font-medium text-white" style={{ background: "var(--red)" }}>
            {error}
          </div>
        )}

        {!data && !loading && (
          <div className="p-8 text-center text-gray-400 text-sm rounded-xl border border-dashed border-gray-300">
            Enter your Zendesk credentials in the sidebar and click Generate Report.
          </div>
        )}

        {loading && (
          <div className="p-8 text-center text-gray-400 text-sm">
            Fetching from Zendesk...
          </div>
        )}

        {data && !loading && (
          <div className="flex flex-col gap-8">
            <StatCards
              rangeReal={rangeReal} rangeOpen={rangeOpen} rangeClosed={rangeClosed}
              rangeRes={rangeRes} unsolved={data.unsolvedTickets}
              highPriority={data.channels["High Priority"]?.tickets || []}
              foIds={foIds} foCount={data.foCount} rangeExcl={rangeExcl}
              sub={creds.subdomain} wSince={wSince} wEnd={wEnd}
              startWk={startWk} endWk={endWk}
            />

            <hr className="border-gray-200" />
            <WeeklyMetrics channels={data.channels} sub={creds.subdomain} />

            <hr className="border-gray-200" />
            <CategoryPerformance catPerf={data.catPerf} sub={creds.subdomain} />

            <hr className="border-gray-200" />
            <WowTrend displayWeeks={displayWeeks} sub={creds.subdomain} startWk={startWk} endWk={endWk} />

            <hr className="border-gray-200" />
            <ResolutionChart catPerf={data.catPerf} />

            <hr className="border-gray-200" />
            <BreakdownPanel
              rangeReal={rangeReal} rangeOpen={rangeOpen} rangeClosed={rangeClosed}
              sub={creds.subdomain} wSince={wSince} wEnd={wEnd} startWk={startWk} endWk={endWk}
            />
          </div>
        )}

        <footer className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          Klarity Support Report — Wk {startWk} to Wk {endWk} ({curYear}) —{" "}
          <a href={`https://${creds.subdomain}.zendesk.com/agent`} target="_blank"
             rel="noreferrer" style={{ color: "var(--orange)" }}>
            Open Zendesk ↗
          </a>
        </footer>
      </main>
    </div>
  )
}
