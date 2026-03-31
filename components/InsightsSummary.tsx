"use client"
import { useState } from "react"
import { ZendeskTicket, CategoryPerf, WeekData } from "@/lib/types"
import { extractCustomer, getCustomField, avg } from "@/lib/dataTransforms"
import { isOpen, isClosed } from "@/lib/ticketClassifiers"
import { FIELD_IDS } from "@/lib/constants"

const C = {
  container:   "#171f33",
  surfaceLow:  "#131b2e",
  high:        "#222a3d",
  highest:     "#2d3449",
  lowest:      "#060e20",
  onSurface:   "#dae2fd",
  onVariant:   "#c6c6cd",
  onSecondary: "#a9bad3",
  primary:     "#89ceff",
  tertiary:    "#3cddc7",
  error:       "#ffb4ab",
  warn:        "#ffb77c",
  outline:     "rgba(69,70,77,0.15)",
}

function Icon({ name, color, size = 20 }: { name: string; color?: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, color: color || C.onVariant, lineHeight: 1 }}>
      {name}
    </span>
  )
}

interface Analysis {
  executive: {
    healthScore: number | null
    status: "HEALTHY" | "STABLE" | "AT_RISK" | "CRITICAL"
    headline: string
    wins: string[]
    risks: string[]
    recommendation: string
  }
  customers: { summary: string; atRisk: string[]; insights: string[] }
  categories: { summary: string; bottleneck: string; insights: string[] }
  trend: { summary: string; pattern: string; insights: string[] }
  resolution: { summary: string; concern: string; insights: string[] }
}

interface Props {
  product: "architect" | "automate"
  weekRange: string
  rangeReal: ZendeskTicket[]
  rangeOpen: ZendeskTicket[]
  rangeClosed: ZendeskTicket[]
  resolutionRate: number
  catPerf: CategoryPerf[]
  displayWeeks: WeekData[]
  foCount: number
  archBuckets?: { fn: number; internal: number; customer: number }
  wowDelta: number | null
  staleOpen: number
}

const STATUS_CONFIG = {
  HEALTHY:  { color: C.tertiary, bg: "rgba(60,221,199,0.12)",  label: "Healthy" },
  STABLE:   { color: C.primary,  bg: "rgba(137,206,255,0.12)", label: "Stable" },
  AT_RISK:  { color: C.warn,     bg: "rgba(255,183,124,0.12)", label: "At Risk" },
  CRITICAL: { color: C.error,    bg: "rgba(255,180,171,0.12)", label: "Critical" },
}

const TABS = [
  { id: "executive",  label: "Overview",    icon: "auto_awesome" },
  { id: "customers",  label: "Customers",   icon: "groups" },
  { id: "categories", label: "Categories",  icon: "category" },
  { id: "trend",      label: "Trend",       icon: "trending_up" },
  { id: "resolution", label: "Resolution",  icon: "timer" },
] as const

type TabId = typeof TABS[number]["id"]

function HealthScore({ score, status }: { score: number | null; status: Analysis["executive"]["status"] }) {
  const cfg = STATUS_CONFIG[status]
  const radius = 22
  const circ = 2 * Math.PI * radius
  const dash = score !== null ? ((score / 10) * circ) : circ * 0.5
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r={radius} fill="none" stroke={C.highest} strokeWidth="4" />
          <circle cx="28" cy="28" r={radius} fill="none" stroke={cfg.color}
            strokeWidth="4" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <span className="absolute text-sm font-black" style={{ color: cfg.color }}>
          {score ?? "—"}
        </span>
      </div>
      <div>
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide"
              style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        <p className="text-[10px] mt-1" style={{ color: C.onSecondary }}>CX Health Score</p>
      </div>
    </div>
  )
}

function InsightList({ items, color = C.onSurface, bullet = "·" }: { items: string[]; color?: string; bullet?: string }) {
  if (!items.length) return <p className="text-xs" style={{ color: C.onSecondary }}>No data for this period.</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="text-xs flex items-start gap-2" style={{ color }}>
          <span className="shrink-0 mt-0.5 font-bold" style={{ color: C.primary }}>{bullet}</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

function SectionCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: C.high, border: `1px solid ${C.outline}` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color }}>
        <Icon name={icon} color={color} size={13} />{title}
      </p>
      {children}
    </div>
  )
}

export default function InsightsSummary({
  product, weekRange, rangeReal, rangeOpen, rangeClosed,
  resolutionRate, catPerf, displayWeeks, foCount, archBuckets,
  wowDelta, staleOpen,
}: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("executive")

  async function generate() {
    setLoading(true); setError(null); setAnalysis(null)

    // Build per-customer breakdown
    const custTickets: Record<string, ZendeskTicket[]> = {}
    for (const t of rangeReal) {
      const c = extractCustomer(t)
      if (!custTickets[c]) custTickets[c] = []
      custTickets[c].push(t)
    }
    const topCustomers = Object.entries(custTickets)
      .sort((a, b) => b[1].length - a[1].length).slice(0, 10)
      .map(([name, count]) => ({ name, count: count.length }))

    const customerBreakdown = Object.entries(custTickets)
      .filter(([name]) => name !== "Other")
      .sort((a, b) => b[1].length - a[1].length).slice(0, 15)
      .map(([name, tix]) => {
        const open   = tix.filter(isOpen).length
        const solved = tix.filter(isClosed).length
        const total  = tix.length
        const resTimes = tix.filter(isClosed).map(t => {
          try {
            const h = Math.round((new Date(t.solved_at ?? t.updated_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000)
            return h >= 0 ? h : null
          } catch { return null }
        }).filter((h): h is number => h !== null)
        const issueCounts: Record<string, number> = {}
        for (const t of tix) {
          const issue = getCustomField(t, FIELD_IDS.ISSUE_TYPE)
          if (issue) issueCounts[issue] = (issueCounts[issue] || 0) + 1
        }
        const topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
        return { name, total, open, solved, resRate: total > 0 ? Math.round(solved / total * 100) : 0, avgResHours: avg(resTimes), topIssue }
      })

    const topCategories = catPerf.slice(0, 6).map(c => ({
      label: c.label.split("/")[0].trim(),
      count: c.count, median: c.median, p90: c.p90,
    }))

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: product.charAt(0).toUpperCase() + product.slice(1),
          weekRange,
          received: rangeReal.length,
          open: rangeOpen.length,
          solved: rangeClosed.length,
          resolutionRate,
          topCategories,
          topCustomers,
          customerBreakdown,
          weekTrend: displayWeeks.map(w => ({ label: w.label, count: w.count })),
          foCount,
          archBuckets: product === "architect" ? archBuckets : null,
          wowDelta,
          staleOpen,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error === "NO_API_KEY"
          ? "OpenRouter API key not configured. Set OPENROUTER_API_KEY in Vercel env vars."
          : `OpenRouter error: ${json.detail || json.error}`)
        return
      }
      setAnalysis(json.analysis)
      setActiveTab("executive")
    } catch (e) {
      setError(`Network error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const exec = analysis?.executive

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: C.container, border: `1px solid rgba(137,206,255,0.12)` }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ background: C.surfaceLow }}>
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" color={C.primary} size={18} />
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#fff" }}>
            AI Intelligence Layer
          </h3>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                style={{ background: "rgba(137,206,255,0.12)", color: C.primary }}>
            Gemini 2.0 Flash
          </span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-all disabled:opacity-50"
          style={{ background: loading ? C.high : `linear-gradient(15deg, ${C.primary}, #004c8a)`, color: C.lowest }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85" }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1" }}
        >
          <Icon name={loading ? "hourglass_empty" : "psychology"} color={C.lowest} size={14} />
          {loading ? "Analysing..." : analysis ? "Re-analyse" : "Run Deep Analysis"}
        </button>
      </div>

      {/* Tab bar — only shown after analysis */}
      {analysis && (
        <div className="flex border-b" style={{ background: C.surfaceLow, borderColor: C.outline }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: activeTab === tab.id ? C.primary : C.onVariant,
                borderBottom: activeTab === tab.id ? `2px solid ${C.primary}` : "2px solid transparent",
                background: "transparent",
              }}
            >
              <Icon name={tab.icon} color={activeTab === tab.id ? C.primary : C.onVariant} size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-5">

        {/* Empty state */}
        {!analysis && !loading && !error && (
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <p className="text-sm font-medium" style={{ color: C.onSurface }}>
                Deep AI analysis across 5 dimensions
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {TABS.map(t => (
                  <span key={t.id} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                        style={{ background: C.high, color: C.onVariant }}>
                    <Icon name={t.icon} size={11} />{t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
                 style={{ borderColor: C.primary, borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: C.onSecondary }}>
              Running deep analysis across all metrics...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2">
            <Icon name="error_outline" color={C.error} size={16} />
            <p className="text-xs" style={{ color: C.error }}>{error}</p>
          </div>
        )}

        {/* Analysis tabs */}
        {analysis && !loading && (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === "executive" && exec && (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-5">
                  <HealthScore score={exec.healthScore} status={exec.status} />
                  <p className="text-sm leading-relaxed flex-1 pt-1" style={{ color: C.onSurface, lineHeight: 1.7 }}>
                    {exec.headline}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SectionCard title="Wins" icon="check_circle" color={C.tertiary}>
                    <InsightList items={exec.wins} bullet="✓" />
                  </SectionCard>
                  <SectionCard title="Watch Items" icon="warning" color={C.error}>
                    <InsightList items={exec.risks} bullet="!" />
                  </SectionCard>
                </div>
                {exec.recommendation && (
                  <div className="rounded-lg px-4 py-3 flex items-start gap-3"
                       style={{ background: "rgba(137,206,255,0.07)", border: `1px solid rgba(137,206,255,0.2)` }}>
                    <Icon name="lightbulb" color={C.primary} size={16} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.primary }}>
                        Recommended Action
                      </p>
                      <p className="text-xs" style={{ color: C.onSurface }}>{exec.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CUSTOMERS ── */}
            {activeTab === "customers" && analysis.customers && (
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: C.onSurface, lineHeight: 1.7 }}>{analysis.customers.summary}</p>
                {analysis.customers.atRisk.length > 0 && (
                  <SectionCard title="At-Risk Customers" icon="person_alert" color={C.warn}>
                    <InsightList items={analysis.customers.atRisk} bullet="⚠" color={C.onSurface} />
                  </SectionCard>
                )}
                <SectionCard title="Customer Insights" icon="groups" color={C.primary}>
                  <InsightList items={analysis.customers.insights} />
                </SectionCard>
              </div>
            )}

            {/* ── CATEGORIES ── */}
            {activeTab === "categories" && analysis.categories && (
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: C.onSurface, lineHeight: 1.7 }}>{analysis.categories.summary}</p>
                {analysis.categories.bottleneck && (
                  <div className="rounded-lg px-4 py-3 flex items-start gap-3"
                       style={{ background: "rgba(255,180,171,0.07)", border: `1px solid rgba(255,180,171,0.2)` }}>
                    <Icon name="block" color={C.error} size={16} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.error }}>
                        Primary Bottleneck
                      </p>
                      <p className="text-xs" style={{ color: C.onSurface }}>{analysis.categories.bottleneck}</p>
                    </div>
                  </div>
                )}
                <SectionCard title="Category Insights" icon="category" color={C.primary}>
                  <InsightList items={analysis.categories.insights} />
                </SectionCard>
              </div>
            )}

            {/* ── TREND ── */}
            {activeTab === "trend" && analysis.trend && (
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: C.onSurface, lineHeight: 1.7 }}>{analysis.trend.summary}</p>
                {analysis.trend.pattern && (
                  <SectionCard title="Pattern Analysis" icon="show_chart" color={C.tertiary}>
                    <p className="text-xs" style={{ color: C.onSurface }}>{analysis.trend.pattern}</p>
                  </SectionCard>
                )}
                <SectionCard title="Trend Insights" icon="trending_up" color={C.primary}>
                  <InsightList items={analysis.trend.insights} />
                </SectionCard>
              </div>
            )}

            {/* ── RESOLUTION ── */}
            {activeTab === "resolution" && analysis.resolution && (
              <div className="flex flex-col gap-4">
                <p className="text-sm" style={{ color: C.onSurface, lineHeight: 1.7 }}>{analysis.resolution.summary}</p>
                {analysis.resolution.concern && (
                  <div className="rounded-lg px-4 py-3 flex items-start gap-3"
                       style={{ background: "rgba(255,183,124,0.07)", border: `1px solid rgba(255,183,124,0.2)` }}>
                    <Icon name="schedule" color={C.warn} size={16} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.warn }}>
                        SLA Concern
                      </p>
                      <p className="text-xs" style={{ color: C.onSurface }}>{analysis.resolution.concern}</p>
                    </div>
                  </div>
                )}
                <SectionCard title="Resolution Insights" icon="timer" color={C.primary}>
                  <InsightList items={analysis.resolution.insights} />
                </SectionCard>
              </div>
            )}

            <p className="text-[10px] mt-3" style={{ color: C.onSecondary }}>
              Based on {rangeReal.length} tickets · {weekRange} · Generated {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
