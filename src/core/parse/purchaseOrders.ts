import { parseCsv, buildColumnMap, toNumber, toIsoDate } from '../csv'
import type { CostEvent, InputFile, PurchaseOrder, PurchaseOrderLine, Warning } from '../model'

const ALIASES: Record<string, string[]> = {
  po_number: ['ponumber', 'purchaseorder', 'po', 'number', 'reference', 'name'],
  supplier_name: ['supplier', 'vendor', 'suppliername'],
  status: ['status', 'state'],
  created_date: ['createdat', 'created', 'createddate', 'date'],
  ordered_date: ['orderedat', 'ordered', 'orderdate', 'sentat', 'ordereddate'],
  received_date: ['receivedat', 'receiveddate', 'received', 'completedat'],
  currency: ['currency'],
  sku: ['sku', 'variantsku'],
  product_title: ['producttitle', 'product', 'title', 'variant', 'item'],
  qty_ordered: ['quantity', 'qty', 'quantityordered', 'orderedqty', 'qtyordered'],
  qty_received: ['receivedquantity', 'quantityreceived', 'qtyreceived', 'receivedqty'],
  unit_cost: ['costprice', 'cost', 'unitcost', 'price', 'costperitem'],
  line_total: ['total', 'totalcost', 'linetotal', 'totalprice'],
}

export function parsePurchaseOrders(file: InputFile): {
  orders: PurchaseOrder[]
  lines: PurchaseOrderLine[]
  costEvents: CostEvent[]
  warnings: Warning[]
} {
  const warnings: Warning[] = []
  const { headers, rows } = parseCsv(file.text)
  const col = buildColumnMap(headers, ALIASES)
  const mappedHeaders = new Set(Object.values(col).filter((v): v is string => v !== undefined))
  const extraHeaders = headers.filter((h) => !mappedHeaders.has(h))

  if (col.po_number === undefined) {
    warnings.push({
      level: 'warn',
      source: file.name,
      message: 'No PO number column recognized — all rows grouped under "(unknown)".',
    })
  }

  const get = (row: Record<string, string>, field: string): string | undefined => {
    const h = col[field]
    const v = h === undefined ? undefined : row[h]
    return v === undefined || v.trim() === '' ? undefined : v.trim()
  }

  const orderByNumber = new Map<string, PurchaseOrder>()
  const lines: PurchaseOrderLine[] = []
  const costEvents: CostEvent[] = []

  for (const row of rows) {
    const poNumber = get(row, 'po_number') ?? '(unknown)'
    let order = orderByNumber.get(poNumber)
    if (order === undefined) {
      order = {
        po_number: poNumber,
        supplier_name: get(row, 'supplier_name'),
        status: get(row, 'status'),
        created_date: toIsoDate(get(row, 'created_date')),
        ordered_date: toIsoDate(get(row, 'ordered_date')),
        received_date: toIsoDate(get(row, 'received_date')),
        currency: get(row, 'currency'),
        extras: {},
      }
      orderByNumber.set(poNumber, order)
    }

    const extras: Record<string, string> = {}
    for (const h of extraHeaders) {
      const v = row[h]
      if (v !== undefined && v.trim() !== '') extras[h] = v.trim()
    }

    const line: PurchaseOrderLine = {
      po_number: poNumber,
      sku: get(row, 'sku'),
      product_title: get(row, 'product_title'),
      qty_ordered: toNumber(get(row, 'qty_ordered')),
      qty_received: toNumber(get(row, 'qty_received')),
      unit_cost: toNumber(get(row, 'unit_cost')),
      line_total: toNumber(get(row, 'line_total')),
      extras,
    }
    lines.push(line)

    if (
      line.sku !== undefined &&
      line.unit_cost !== undefined &&
      line.qty_received !== undefined &&
      line.qty_received > 0
    ) {
      costEvents.push({
        sku: line.sku,
        date: order.received_date,
        qty: line.qty_received,
        unit_cost: line.unit_cost,
        source: 'po_receipt',
      })
    }
  }

  return { orders: [...orderByNumber.values()], lines, costEvents, warnings }
}
