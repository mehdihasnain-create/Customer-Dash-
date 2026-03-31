import "server-only"
import { put, list } from "@vercel/blob"
import { ZendeskTicket } from "./types"

function weekKey(subdomain: string, year: number, weekNum: number) {
  return `klarity-cx/${subdomain}/${year}/W${String(weekNum).padStart(2, "0")}.json`
}

export async function getCachedWeek(
  subdomain: string,
  year: number,
  weekNum: number
): Promise<ZendeskTicket[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  try {
    const { blobs } = await list({ prefix: weekKey(subdomain, year, weekNum) })
    if (!blobs.length) return null
    const res = await fetch(blobs[0].url, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function setCachedWeek(
  subdomain: string,
  year: number,
  weekNum: number,
  tickets: ZendeskTicket[]
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return
  try {
    await put(weekKey(subdomain, year, weekNum), JSON.stringify(tickets), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    })
  } catch (e) {
    console.error(`[weekCache] write failed for W${weekNum}:`, e)
  }
}
