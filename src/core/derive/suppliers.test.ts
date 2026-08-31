import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parsePurchaseOrders } from '../parse/purchaseOrders'
import { deriveSuppliers } from './suppliers'

const fixture = {
  name: 'stocky_po_export.csv',
  text: readFileSync('fixtures/stocky_po_export.csv', 'utf-8'),
}

describe('deriveSuppliers', () => {
  it('reconstructs suppliers from PO history', () => {
    const { orders, lines } = parsePurchaseOrders(fixture)
    const suppliers = deriveSuppliers(orders, lines)
    expect(suppliers.map((s) => s.supplier_name)).toEqual(['Acme Textiles', 'Blue Denim Co'])

    const acme = suppliers[0]!
    expect(acme.po_count).toBe(2) // PO-1001, PO-1003
    expect(acme.total_spend).toBe(287) // 45 + 95 + 147 (line totals)
    expect(acme.first_order_date).toBe('2026-05-02')
    expect(acme.last_order_date).toBe('2026-08-02')
    expect(acme.avg_lead_time_days).toBe(10) // only PO-1001 has both dates
    expect(acme.currencies).toEqual(['USD'])

    const blue = suppliers[1]!
    expect(blue.po_count).toBe(1)
    expect(blue.total_spend).toBe(180)
    expect(blue.avg_lead_time_days).toBe(14)
  })

  it('skips orders without a supplier name', () => {
    const suppliers = deriveSuppliers(
      [{ po_number: 'X', extras: {} }],
      [{ po_number: 'X', extras: {} }],
    )
    expect(suppliers).toEqual([])
  })

  it('uses qty_ordered * unit_cost as spend fallback when line_total absent', () => {
    const suppliers = deriveSuppliers(
      [{ po_number: 'PO-100', supplier_name: 'TestCo', extras: {} }],
      [{ po_number: 'PO-100', qty_ordered: 4, unit_cost: 2.5, extras: {} }],
    )
    expect(suppliers).toHaveLength(1)
    expect(suppliers[0]!.total_spend).toBe(10)
  })

  it('sorts suppliers alphabetically by name regardless of insertion order', () => {
    const suppliers = deriveSuppliers(
      [
        { po_number: 'PO-1', supplier_name: 'Zeta Supply', extras: {} },
        { po_number: 'PO-2', supplier_name: 'Alpha Goods', extras: {} },
      ],
      [],
    )
    expect(suppliers.map((s) => s.supplier_name)).toEqual(['Alpha Goods', 'Zeta Supply'])
  })
})
