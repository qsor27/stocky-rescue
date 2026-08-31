import type { PurchaseOrder, PurchaseOrderLine, Supplier } from '../model'

const DAY_MS = 24 * 60 * 60 * 1000

export function deriveSuppliers(orders: PurchaseOrder[], lines: PurchaseOrderLine[]): Supplier[] {
  const linesByPo = new Map<string, PurchaseOrderLine[]>()
  for (const line of lines) {
    const list = linesByPo.get(line.po_number) ?? []
    list.push(line)
    linesByPo.set(line.po_number, list)
  }

  interface Acc {
    poCount: number
    spend: number
    hasSpend: boolean
    orderDates: string[]
    leadTimes: number[]
    currencies: Set<string>
  }
  const bySupplier = new Map<string, Acc>()

  for (const order of orders) {
    const name = order.supplier_name
    if (name === undefined) continue
    let acc = bySupplier.get(name)
    if (acc === undefined) {
      acc = { poCount: 0, spend: 0, hasSpend: false, orderDates: [], leadTimes: [], currencies: new Set() }
      bySupplier.set(name, acc)
    }
    acc.poCount++
    if (order.currency !== undefined) acc.currencies.add(order.currency)
    const orderDate = order.ordered_date ?? order.created_date
    if (orderDate !== undefined) acc.orderDates.push(orderDate)
    if (order.ordered_date !== undefined && order.received_date !== undefined) {
      const days = (Date.parse(order.received_date) - Date.parse(order.ordered_date)) / DAY_MS
      if (Number.isFinite(days) && days >= 0) acc.leadTimes.push(days)
    }
    for (const line of linesByPo.get(order.po_number) ?? []) {
      const lineSpend =
        line.line_total ??
        (line.qty_ordered !== undefined && line.unit_cost !== undefined
          ? line.qty_ordered * line.unit_cost
          : undefined)
      if (lineSpend !== undefined) {
        acc.spend += lineSpend
        acc.hasSpend = true
      }
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100
  return [...bySupplier.entries()]
    .map(([supplier_name, acc]): Supplier => {
      const dates = acc.orderDates.slice().sort()
      return {
        supplier_name,
        po_count: acc.poCount,
        total_spend: acc.hasSpend ? round2(acc.spend) : undefined,
        first_order_date: dates[0],
        last_order_date: dates[dates.length - 1],
        avg_lead_time_days:
          acc.leadTimes.length > 0
            ? round2(acc.leadTimes.reduce((a, b) => a + b, 0) / acc.leadTimes.length)
            : undefined,
        currencies: [...acc.currencies].sort(),
      }
    })
    .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name))
}
