import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseStocktakes } from './stocktakes'
import { parseCostReport } from './costs'
import { parseShopifyProducts } from './shopifyProducts'

const read = (f: string) => ({ name: f, text: readFileSync(`fixtures/${f}`, 'utf-8') })

describe('parseStocktakes', () => {
  it('normalizes stocktake rows', () => {
    const { stocktakes } = parseStocktakes(read('stocky_stocktakes.csv'))
    expect(stocktakes).toHaveLength(2)
    expect(stocktakes[0]).toMatchObject({
      stocktake_ref: 'ST-1',
      completed_date: '2026-07-15',
      sku: 'TSHIRT-S',
      qty_expected: 12,
      qty_counted: 11,
      qty_difference: -1,
    })
  })
})

describe('parseCostReport', () => {
  it('produces cost_report events', () => {
    const { costEvents } = parseCostReport(read('stocky_cost_report.csv'))
    expect(costEvents).toEqual([
      { sku: 'TSHIRT-S', date: '2026-04-01', qty: 5, unit_cost: 4.2, source: 'cost_report' },
    ])
  })
  it('warns and skips rows without sku or cost', () => {
    const { costEvents, warnings } = parseCostReport({
      name: 'c.csv',
      text: 'SKU,Cost price\nX-1,\n,3.00\nY-2,5.00\n',
    })
    expect(costEvents).toHaveLength(1)
    expect(warnings.some((w) => w.message.includes('skipped'))).toBe(true)
  })
})

describe('parseShopifyProducts', () => {
  it('extracts on-hand by sku', () => {
    const { stock } = parseShopifyProducts(read('shopify_products.csv'))
    expect(stock).toEqual([
      { sku: 'TSHIRT-S', product_title: 'Basic Tee', on_hand: 25 },
      { sku: 'JEAN-32', product_title: 'Denim Jean', on_hand: 7 },
    ])
  })
})
