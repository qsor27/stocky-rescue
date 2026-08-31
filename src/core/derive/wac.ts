import type { CostEvent, ProductStock, WacRow } from '../model'

const DAY_MS = 24 * 60 * 60 * 1000
const round2 = (n: number) => Math.round(n * 100) / 100

function weightedAvg(events: CostEvent[]): number | undefined {
  let qtySum = 0
  let valueSum = 0
  for (const e of events) {
    if (e.qty !== undefined && e.qty > 0) {
      qtySum += e.qty
      valueSum += e.qty * e.unit_cost
    }
  }
  return qtySum > 0 ? round2(valueSum / qtySum) : undefined
}

export function deriveWac(events: CostEvent[], stock: ProductStock[], now: Date): WacRow[] {
  const stockBySku = new Map(stock.map((s) => [s.sku, s]))
  const bySku = new Map<string, CostEvent[]>()
  for (const e of events) {
    const list = bySku.get(e.sku) ?? []
    list.push(e)
    bySku.set(e.sku, list)
  }

  const withinDays = (e: CostEvent, days: number): boolean =>
    e.date !== undefined && now.getTime() - Date.parse(e.date) <= days * DAY_MS

  const rows: WacRow[] = []
  for (const [sku, list] of bySku.entries()) {
    let last: CostEvent | undefined
    for (const e of list) {
      if (last === undefined) last = e
      else if ((e.date ?? '') >= (last.date ?? '')) last = e
    }
    const onHand = stockBySku.get(sku)?.on_hand
    const avgAll = weightedAvg(list)
    rows.push({
      sku,
      receipt_count: list.length,
      last_cost: last?.unit_cost,
      last_cost_date: last?.date,
      avg_cost_all_time: avgAll,
      avg_cost_90d: weightedAvg(list.filter((e) => withinDays(e, 90))),
      avg_cost_365d: weightedAvg(list.filter((e) => withinDays(e, 365))),
      on_hand: onHand,
      value_at_last_cost:
        onHand !== undefined && last !== undefined ? round2(onHand * last.unit_cost) : undefined,
      value_at_avg_all_time:
        onHand !== undefined && avgAll !== undefined ? round2(onHand * avgAll) : undefined,
    })
  }
  return rows.sort((a, b) => a.sku.localeCompare(b.sku))
}
