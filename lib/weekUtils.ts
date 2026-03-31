import { WeekData, ZendeskTicket } from "./types"

export function mondayOf(d: Date): Date {
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const result = new Date(d)
  result.setDate(d.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function isoWeekBounds(year: number, weekNum: number): [Date, Date] {
  const jan4 = new Date(year, 0, 4) // Jan 4 is always in Week 1
  const week1Mon = mondayOf(jan4)
  const start = new Date(week1Mon)
  start.setDate(week1Mon.getDate() + (weekNum - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [start, end]
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDisplay(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", timeZone: "UTC" }
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`
}

export function getYearWeeks(year: number): Omit<WeekData, "tickets" | "count">[] {
  const today = new Date()
  const curYear = today.getFullYear()
  // Approximate current ISO week
  const jan4 = new Date(curYear, 0, 4)
  const week1Mon = mondayOf(jan4)
  const msPerWeek = 7 * 24 * 3600 * 1000
  const curWeek = Math.floor((mondayOf(today).getTime() - week1Mon.getTime()) / msPerWeek) + 1
  const maxWeek = year === curYear ? curWeek : 52

  const weeks: Omit<WeekData, "tickets" | "count">[] = []
  for (let wn = 1; wn <= maxWeek; wn++) {
    const [start, end] = isoWeekBounds(year, wn)
    // end is exclusive for filtering (start of next day)
    const endExclusive = new Date(end)
    endExclusive.setDate(end.getDate() + 1)
    const isCur = year === curYear && wn === curWeek
    weeks.push({
      label:   `Wk ${wn}${isCur ? " (cur)" : ""}`,
      weekNum: wn,
      start:   toISO(start),
      end:     toISO(endExclusive),
      display: formatDisplay(start, end),
    })
  }
  return weeks
}

export function since4Weeks(): string {
  const mon = mondayOf(new Date())
  mon.setDate(mon.getDate() - 21) // 3 weeks back = start of 4-week window
  return toISO(mon)
}

export function inWeek(t: ZendeskTicket, w: Pick<WeekData, "start" | "end">): boolean {
  const c = (t.created_at || "").slice(0, 10)
  return c >= w.start && c < w.end
}
