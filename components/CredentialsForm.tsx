"use client"
import { Credentials } from "@/lib/types"

interface Props {
  creds: Credentials
  onCreds: (c: Credentials) => void
  startWk: number
  endWk: number
  allWeeks: { weekNum: number; label: string }[]
  onStartWk: (n: number) => void
  onEndWk: (n: number) => void
  onGenerate: () => void
  loading: boolean
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm border-0 focus:outline-none focus:ring-1"
const labelCls = "text-xs font-semibold uppercase tracking-widest mb-1 block"

export default function CredentialsForm({ creds, onCreds, startWk, endWk, allWeeks, onStartWk, onEndWk, onGenerate, loading }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelCls} style={{ color: "var(--on-secondary)" }}>Subdomain</label>
        <input
          className={inputCls}
          style={{ background: "var(--surface-lowest)", color: "var(--on-surface)", caretColor: "var(--primary)" }}
          value={creds.subdomain}
          onChange={e => onCreds({ ...creds, subdomain: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--on-secondary)" }}>Email</label>
        <input
          className={inputCls}
          style={{ background: "var(--surface-lowest)", color: "var(--on-surface)", caretColor: "var(--primary)" }}
          type="text"
          value={creds.email}
          onChange={e => onCreds({ ...creds, email: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--on-secondary)" }}>API Token</label>
        <input
          className={inputCls}
          style={{ background: "var(--surface-lowest)", color: "var(--on-surface)", caretColor: "var(--primary)" }}
          type="password"
          value={creds.token}
          onChange={e => onCreds({ ...creds, token: e.target.value })}
          placeholder="Zendesk API token"
        />
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--on-secondary)" }}>From Week</label>
        <select
          className={inputCls}
          style={{ background: "var(--surface-lowest)", color: "var(--on-surface)" }}
          value={startWk}
          onChange={e => onStartWk(Number(e.target.value))}>
          {allWeeks.map(w => (
            <option key={w.weekNum} value={w.weekNum} style={{ background: "var(--surface-highest)", color: "var(--on-surface)" }}>{w.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} style={{ color: "var(--on-secondary)" }}>To Week</label>
        <select
          className={inputCls}
          style={{ background: "var(--surface-lowest)", color: "var(--on-surface)" }}
          value={endWk}
          onChange={e => onEndWk(Number(e.target.value))}>
          {allWeeks.map(w => (
            <option key={w.weekNum} value={w.weekNum} style={{ background: "var(--surface-highest)", color: "var(--on-surface)" }}>{w.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
        style={{
          background: loading ? "var(--surface-high)" : "linear-gradient(15deg, var(--primary), var(--primary-container))",
          color: loading ? "var(--on-secondary)" : "var(--on-primary)",
        }}
      >
        {loading ? "Loading..." : "Generate Report"}
      </button>
    </div>
  )
}
