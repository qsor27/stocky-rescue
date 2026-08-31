import { parseCsv, buildColumnMap, toNumber, toIsoDate } from '../csv'
import type { CostEvent, InputFile, Warning } from '../model'

const ALIASES: Record<string, string[]> = {
  sku: ['sku', 'variantsku'],
  date: ['date', 'receivedat', 'createdat'],
  qty: ['quantity', 'qty', 'receivedquantity'],
  unit_cost: ['costprice', 'cost', 'unitcost', 'price'],
}

export function parseCostReport(file: InputFile): { costEvents: CostEvent[]; warnings: Warning[] } {
  const warnings: Warning[] = []
  const { headers, rows } = parseCsv(file.text)
  const col = buildColumnMap(headers, ALIASES)

  const get = (row: Record<string, string>, field: string): string | undefined => {
    const h = col[field]
    const v = h === undefined ? undefined : row[h]
    return v === undefined || v.trim() === '' ? undefined : v.trim()
  }

  const costEvents: CostEvent[] = []
  let skipped = 0
  for (const row of rows) {
    const sku = get(row, 'sku')
    const cost = toNumber(get(row, 'unit_cost'))
    if (sku === undefined || cost === undefined) {
      skipped++
      continue
    }
    costEvents.push({
      sku,
      date: toIsoDate(get(row, 'date')),
      qty: toNumber(get(row, 'qty')),
      unit_cost: cost,
      source: 'cost_report',
    })
  }
  if (skipped > 0) {
    warnings.push({
      level: 'warn',
      source: file.name,
      message: `${skipped} cost row(s) skipped (missing SKU or cost).`,
    })
  }
  return { costEvents, warnings }
}
