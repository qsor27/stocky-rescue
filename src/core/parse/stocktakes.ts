import { parseCsv, buildColumnMap, toNumber, toIsoDate } from '../csv'
import type { InputFile, StocktakeRow, Warning } from '../model'

const ALIASES: Record<string, string[]> = {
  stocktake_ref: ['stocktake', 'stocktakename', 'reference', 'name', 'id'],
  completed_date: ['completedat', 'completed', 'date', 'createdat'],
  sku: ['sku', 'variantsku'],
  qty_expected: ['expectedquantity', 'expected', 'expectedqty'],
  qty_counted: ['countedquantity', 'counted', 'countedqty', 'actual'],
  qty_difference: ['difference', 'discrepancy', 'variance', 'delta'],
}

export function parseStocktakes(file: InputFile): { stocktakes: StocktakeRow[]; warnings: Warning[] } {
  const warnings: Warning[] = []
  const { headers, rows } = parseCsv(file.text)
  const col = buildColumnMap(headers, ALIASES)
  const mapped = new Set(Object.values(col).filter((v): v is string => v !== undefined))
  const extraHeaders = headers.filter((h) => !mapped.has(h))

  const get = (row: Record<string, string>, field: string): string | undefined => {
    const h = col[field]
    const v = h === undefined ? undefined : row[h]
    return v === undefined || v.trim() === '' ? undefined : v.trim()
  }

  const stocktakes: StocktakeRow[] = rows.map((row) => {
    const extras: Record<string, string> = {}
    for (const h of extraHeaders) {
      const v = row[h]
      if (v !== undefined && v.trim() !== '') extras[h] = v.trim()
    }
    return {
      stocktake_ref: get(row, 'stocktake_ref'),
      completed_date: toIsoDate(get(row, 'completed_date')),
      sku: get(row, 'sku'),
      qty_expected: toNumber(get(row, 'qty_expected')),
      qty_counted: toNumber(get(row, 'qty_counted')),
      qty_difference: toNumber(get(row, 'qty_difference')),
      extras,
    }
  })
  return { stocktakes, warnings }
}
