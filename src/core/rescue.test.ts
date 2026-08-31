import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import JSZip from 'jszip'
import { rescue } from './rescue'
import { datasetTables } from './emit/tables'

const NOW = new Date('2026-08-31T00:00:00Z')
const read = (f: string) => ({ name: f, text: readFileSync(`fixtures/${f}`, 'utf-8') })

describe('rescue pipeline', () => {
  it('produces a full dataset from all four fixtures', async () => {
    const { dataset } = await rescue(
      [
        read('stocky_po_export.csv'),
        read('stocky_stocktakes.csv'),
        read('stocky_cost_report.csv'),
        read('shopify_products.csv'),
      ],
      NOW,
    )
    expect(dataset.purchase_orders).toHaveLength(3)
    expect(dataset.purchase_order_lines).toHaveLength(4)
    expect(dataset.stocktakes).toHaveLength(2)
    expect(dataset.cost_history).toHaveLength(4) // 3 receipts + 1 cost-report row
    expect(dataset.suppliers.map((s) => s.supplier_name)).toEqual(['Acme Textiles', 'Blue Denim Co'])
    expect(dataset.wac_report.find((w) => w.sku === 'TSHIRT-S')?.on_hand).toBe(25)
    expect(dataset.sources).toHaveLength(4)
    expect(dataset.sources[0]).toMatchObject({
      filename: 'stocky_po_export.csv',
      detected_type: 'stocky_po',
      rows: 4,
    })
  })

  it('warns on unknown files instead of failing', async () => {
    const { dataset } = await rescue([{ name: 'junk.csv', text: 'foo,bar\n1,2\n' }], NOW)
    expect(dataset.warnings.some((w) => w.message.includes('junk.csv'))).toBe(true)
    expect(dataset.purchase_orders).toEqual([])
  })

  it('zip contains all expected entries', async () => {
    const { zipBlob } = await rescue([read('stocky_po_export.csv')], NOW)
    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer())
    const names = Object.keys(zip.files).sort()
    expect(names).toEqual([
      'README.txt',
      'cost_history.csv',
      'dataset.json',
      'manifest.json',
      'purchase_order_lines.csv',
      'purchase_orders.csv',
      'stocktakes.csv',
      'suppliers.csv',
      'wac_report.csv',
    ])
    const manifest = JSON.parse(await zip.files['manifest.json']!.async('string'))
    expect(manifest.tool).toBe('stocky-rescue')
    expect(manifest.format_version).toBe(1)
    expect(manifest.generated_at).toBe('2026-08-31T00:00:00.000Z')
  })
})

describe('datasetTables', () => {
  it('prefixes extra columns with x_ and never drops them', async () => {
    const { dataset } = await rescue(
      [{ name: 'po.csv', text: 'PO number,Supplier,SKU,Quantity,Warehouse\nP1,Acme,X,5,East\n' }],
      NOW,
    )
    const tables = datasetTables(dataset)
    const lines = tables['purchase_order_lines.csv']!
    expect(lines).toContain('x_Warehouse')
    expect(lines).toContain('East')
  })
})
