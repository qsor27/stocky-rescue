import Papa from 'papaparse'
import { normalizeHeader } from '../csv'
import type { WacRow } from '../model'

const SKU_ALIASES = ['variantsku', 'sku']
const COST_HEADER = 'Cost per item'

/** Round-trip the merchant's own Shopify products export with recovered costs filled in.
 *
 * The safe way to bulk-update costs in Shopify is re-importing the store's own export
 * with only the target column changed — a minimal-column CSV risks the importer
 * clearing omitted fields. So every original column and value passes through verbatim;
 * only "Cost per item" is set (or appended) on rows whose SKU has a recovered cost.
 * Returns undefined when the file has no recognizable SKU column or nothing matched. */
export function buildShopifyCostImport(
  rawCsv: string,
  wacRows: WacRow[],
): { csv: string; updated: number } | undefined {
  const parsed = Papa.parse<Record<string, string>>(rawCsv.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const headers = (parsed.meta.fields ?? []).filter((h) => h.trim() !== '')
  const skuHeader = headers.find((h) => SKU_ALIASES.includes(normalizeHeader(h)))
  if (skuHeader === undefined) return undefined

  const costBySku = new Map<string, number>()
  for (const w of wacRows) {
    const cost = w.last_cost ?? w.avg_cost_all_time
    if (cost !== undefined) costBySku.set(w.sku, cost)
  }
  if (costBySku.size === 0) return undefined

  let costHeader = headers.find((h) => normalizeHeader(h) === normalizeHeader(COST_HEADER))
  const outHeaders = costHeader === undefined ? [...headers, COST_HEADER] : headers
  if (costHeader === undefined) costHeader = COST_HEADER

  let updated = 0
  const data = parsed.data.map((row) => {
    const sku = row[skuHeader]?.trim()
    const cost = sku !== undefined && sku !== '' ? costBySku.get(sku) : undefined
    const out: Record<string, string> = {}
    for (const h of outHeaders) out[h] = row[h] ?? ''
    if (cost !== undefined) {
      out[costHeader] = cost.toFixed(2)
      updated++
    }
    return outHeaders.map((h) => out[h] ?? '')
  })
  if (updated === 0) return undefined

  return { csv: Papa.unparse({ fields: outHeaders, data }, { newline: '\n' }), updated }
}
