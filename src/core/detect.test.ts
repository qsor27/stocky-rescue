import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCsv } from './csv'
import { detectFileType } from './detect'

function headersOf(fixture: string): string[] {
  return parseCsv(readFileSync(`fixtures/${fixture}`, 'utf-8')).headers
}

describe('detectFileType', () => {
  it('detects each fixture correctly', () => {
    expect(detectFileType(headersOf('stocky_po_export.csv'))).toBe('stocky_po')
    expect(detectFileType(headersOf('stocky_stocktakes.csv'))).toBe('stocky_stocktake')
    expect(detectFileType(headersOf('stocky_cost_report.csv'))).toBe('stocky_cost')
    expect(detectFileType(headersOf('shopify_products.csv'))).toBe('shopify_products')
  })
  it('detects header variants', () => {
    expect(detectFileType(['Purchase Order', 'Vendor', 'Sku', 'Qty'])).toBe('stocky_po')
    expect(detectFileType(['SKU', 'Counted', 'Expected'])).toBe('stocky_stocktake')
  })
  it('returns unknown for unrecognizable headers', () => {
    expect(detectFileType(['foo', 'bar'])).toBe('unknown')
    expect(detectFileType([])).toBe('unknown')
  })
})
