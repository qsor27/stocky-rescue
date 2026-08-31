import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parsePurchaseOrders } from './purchaseOrders'

const fixture = {
  name: 'stocky_po_export.csv',
  text: readFileSync('fixtures/stocky_po_export.csv', 'utf-8'),
}

describe('parsePurchaseOrders', () => {
  it('groups line-level rows into orders', () => {
    const { orders } = parsePurchaseOrders(fixture)
    expect(orders.map((o) => o.po_number)).toEqual(['PO-1001', 'PO-1002', 'PO-1003'])
    const po1 = orders[0]!
    expect(po1.supplier_name).toBe('Acme Textiles')
    expect(po1.ordered_date).toBe('2026-05-02')
    expect(po1.received_date).toBe('2026-05-12')
  })

  it('parses lines with coerced numbers', () => {
    const { lines } = parsePurchaseOrders(fixture)
    expect(lines).toHaveLength(4)
    const tshirtM = lines.find((l) => l.sku === 'TSHIRT-M')!
    expect(tshirtM.qty_ordered).toBe(20)
    expect(tshirtM.qty_received).toBe(18)
    expect(tshirtM.unit_cost).toBe(4.75) // "$4.75" cleaned
    expect(tshirtM.line_total).toBe(95)
  })

  it('emits cost events only for received quantities', () => {
    const { costEvents } = parsePurchaseOrders(fixture)
    // PO-1003 has no received qty -> no event
    expect(costEvents).toHaveLength(3)
    const s = costEvents.find((e) => e.sku === 'TSHIRT-S')!
    expect(s).toMatchObject({ qty: 10, unit_cost: 4.5, date: '2026-05-12', source: 'po_receipt' })
  })

  it('preserves unmapped columns as extras and warns on missing po number', () => {
    const res = parsePurchaseOrders({
      name: 'odd.csv',
      text: 'Supplier,SKU,Quantity,Warehouse\nAcme,X-1,5,East\n',
    })
    expect(res.lines[0]!.extras).toEqual({ Warehouse: 'East' })
    expect(res.orders[0]!.po_number).toBe('(unknown)')
    expect(res.warnings.some((w) => w.message.includes('PO number'))).toBe(true)
  })
})
