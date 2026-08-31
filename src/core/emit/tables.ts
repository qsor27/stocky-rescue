import Papa from 'papaparse'
import type { RescueDataset } from '../model'

type Row = Record<string, unknown> & { extras?: Record<string, string> }

function toCsv(rows: Row[], baseColumns: string[]): string {
  const extraKeys = new Set<string>()
  for (const r of rows) {
    for (const k of Object.keys(r.extras ?? {})) extraKeys.add(k)
  }
  const extraColumns = [...extraKeys].sort().map((k) => `x_${k}`)
  const columns = [...baseColumns, ...extraColumns]
  const data = rows.map((r) => {
    const out: Record<string, unknown> = {}
    for (const c of baseColumns) out[c] = r[c] ?? ''
    for (const k of extraKeys) out[`x_${k}`] = r.extras?.[k] ?? ''
    return out
  })
  return Papa.unparse({ fields: columns, data: data.map((d) => columns.map((c) => d[c])) })
}

export function datasetTables(d: RescueDataset): Record<string, string> {
  return {
    'purchase_orders.csv': toCsv(d.purchase_orders as unknown as Row[], [
      'po_number', 'supplier_name', 'status', 'created_date', 'ordered_date', 'received_date', 'currency',
    ]),
    'purchase_order_lines.csv': toCsv(d.purchase_order_lines as unknown as Row[], [
      'po_number', 'sku', 'product_title', 'qty_ordered', 'qty_received', 'unit_cost', 'line_total',
    ]),
    'stocktakes.csv': toCsv(d.stocktakes as unknown as Row[], [
      'stocktake_ref', 'completed_date', 'sku', 'qty_expected', 'qty_counted', 'qty_difference',
    ]),
    'cost_history.csv': toCsv(d.cost_history as unknown as Row[], [
      'sku', 'date', 'qty', 'unit_cost', 'source',
    ]),
    'suppliers.csv': toCsv(
      d.suppliers.map((s) => ({ ...s, currencies: s.currencies.join(';') })) as unknown as Row[],
      ['supplier_name', 'po_count', 'total_spend', 'first_order_date', 'last_order_date', 'avg_lead_time_days', 'currencies'],
    ),
    'wac_report.csv': toCsv(d.wac_report as unknown as Row[], [
      'sku', 'receipt_count', 'last_cost', 'last_cost_date', 'avg_cost_all_time', 'avg_cost_90d', 'avg_cost_365d', 'on_hand', 'value_at_last_cost', 'value_at_avg_all_time',
    ]),
  }
}
