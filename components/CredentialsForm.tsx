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

const inputCls = "w-full rounded-md px-3 py-2 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-orange-400"
const labelCls = "text-xs text-white/60 font-semibold uppercase tracking-wide"
const selectCls = "w-full rounded-md px-3 py-2 text-sm bg-white/10 text-white border border-white/20 focus:outline-none focus:border-orange-400 [&>option]:text-black [&>option]:bg-white"

export default function CredentialsForm({ creds, onCreds, startWk, endWk, allWeeks, onStartWk, onEndWk, onGenerate, loading }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Subdomain</label>
        <input className={inputCls} value={creds.subdomain}
          onChange={e => onCreds({ ...creds, subdomain: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input className={inputCls} type="email" value={creds.email}
          onChange={e => onCreds({ ...creds, email: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>API Token</label>
        <input className={inputCls} type="password" value={creds.token}
          onChange={e => onCreds({ ...creds, token: e.target.value })}
          placeholder="Zendesk API token" />
      </div>
      <div>
        <label className={labelCls}>From Week</label>
        <select className={selectCls} value={startWk}
          onChange={e => onStartWk(Number(e.target.value))}>
          {allWeeks.map(w => (
            <option key={w.weekNum} value={w.weekNum}>{w.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>To Week</label>
        <select className={selectCls} value={endWk}
          onChange={e => onEndWk(Number(e.target.value))}>
          {allWeeks.map(w => (
            <option key={w.weekNum} value={w.weekNum}>{w.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50"
        style={{ background: loading ? "#888" : "var(--orange)" }}
        onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = "var(--orange-dark)" }}
        onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = "var(--orange)" }}
      >
        {loading ? "Loading..." : "Generate Report"}
      </button>
    </div>
  )
}
