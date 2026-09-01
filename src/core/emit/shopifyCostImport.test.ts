import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildShopifyCostImport } from './shopifyCostImport'
import type { WacRow } from '../model'

const wac = (rows: Partial<WacRow>[]): WacRow[] =>
  rows.map((r) => ({ sku: 'X', receipt_count: 1, ...r }) as WacRow)

const fixtureCsv = readFileSync('fixtures/shopify_products.csv', 'utf-8')

describe('buildShopifyCostImport', () => {
  it('appends Cost per item when the export lacks the column, preserving all original columns', () => {
    const res = buildShopifyCostImport(
      fixtureCsv,
      wac([
        { sku: 'TSHIRT-S', last_cost: 4.5 },
        { sku: 'JEAN-32', last_cost: 12 },
      ]),
    )
    expect(res).toBeDefined()
    expect(res!.updated).toBe(2)
    const lines = res!.csv.split('\n')
    expect(lines[0]).toBe('Handle,Title,Variant SKU,Variant Inventory Qty,Variant Price,Cost per item')
    expect(lines[1]).toBe('basic-tee,Basic Tee,TSHIRT-S,25,19.99,4.50')
    expect(lines[2]).toBe('denim-jean,Denim Jean,JEAN-32,7,49.99,12.00')
  })

  it('updates an existing Cost per item column in place and leaves unmatched rows untouched', () => {
    const raw =
      'Handle,Variant SKU,Cost per item,Vendor\n' +
      'basic-tee,TSHIRT-S,1.00,OldVendor\n' +
      'mystery,NO-MATCH,9.99,KeepMe\n'
    const res = buildShopifyCostImport(raw, wac([{ sku: 'TSHIRT-S', last_cost: 4.5 }]))
    expect(res!.updated).toBe(1)
    const lines = res!.csv.split('\n')
    expect(lines[0]).toBe('Handle,Variant SKU,Cost per item,Vendor')
    expect(lines[1]).toBe('basic-tee,TSHIRT-S,4.50,OldVendor')
    expect(lines[2]).toBe('mystery,NO-MATCH,9.99,KeepMe')
  })

  it('falls back to avg_cost_all_time when last_cost is absent', () => {
    const res = buildShopifyCostImport(
      fixtureCsv,
      wac([{ sku: 'TSHIRT-S', last_cost: undefined, avg_cost_all_time: 4.4 }]),
    )
    expect(res!.updated).toBe(1)
    expect(res!.csv).toContain('basic-tee,Basic Tee,TSHIRT-S,25,19.99,4.40')
  })

  it('returns undefined when no SKU column exists or no cost matches', () => {
    expect(buildShopifyCostImport('Foo,Bar\n1,2\n', wac([{ sku: 'TSHIRT-S', last_cost: 4.5 }]))).toBeUndefined()
    expect(buildShopifyCostImport(fixtureCsv, wac([{ sku: 'ZZZ', last_cost: 1 }]))).toBeUndefined()
    expect(buildShopifyCostImport(fixtureCsv, [])).toBeUndefined()
  })
})
