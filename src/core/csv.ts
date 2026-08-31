import Papa from 'papaparse'

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const headers = (res.meta.fields ?? []).filter((h) => h.trim() !== '')
  return { headers, rows: res.data }
}

export function buildColumnMap(
  headers: string[],
  aliases: Record<string, string[]>,
): Record<string, string | undefined> {
  const byNorm = new Map<string, string>()
  for (const h of headers) {
    const n = normalizeHeader(h)
    if (!byNorm.has(n)) byNorm.set(n, h)
  }
  const map: Record<string, string | undefined> = {}
  for (const [field, list] of Object.entries(aliases)) {
    for (const alias of list) {
      const hit = byNorm.get(alias)
      if (hit !== undefined) {
        map[field] = hit
        break
      }
    }
  }
  return map
}

export function toNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

export function toIsoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (t === '') return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const ms = Date.parse(t)
  if (Number.isNaN(ms)) return undefined
  return new Date(ms).toISOString().slice(0, 10)
}
