import { describe, it, expect } from 'vitest'
import { parseCsv, normalizeHeader, buildColumnMap, toNumber, toIsoDate } from './csv'

describe('normalizeHeader', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeHeader('PO number')).toBe('ponumber')
    expect(normalizeHeader('Cost (USD)')).toBe('costusd')
  })
})

describe('parseCsv', () => {
  it('parses headered CSV into rows keyed by original header', () => {
    const { headers, rows } = parseCsv('A,B\n1,x\n2,y\n')
    expect(headers).toEqual(['A', 'B'])
    expect(rows).toEqual([{ A: '1', B: 'x' }, { A: '2', B: 'y' }])
  })
  it('skips blank lines', () => {
    const { rows } = parseCsv('A,B\n1,x\n\n2,y\n\n')
    expect(rows).toHaveLength(2)
  })
})

describe('buildColumnMap', () => {
  it('maps canonical fields to actual headers via aliases, first match wins', () => {
    const map = buildColumnMap(['PO Number', 'Vendor'], {
      po_number: ['ponumber', 'purchaseorder'],
      supplier_name: ['supplier', 'vendor'],
      status: ['status'],
    })
    expect(map.po_number).toBe('PO Number')
    expect(map.supplier_name).toBe('Vendor')
    expect(map.status).toBeUndefined()
  })
})

describe('toNumber', () => {
  it('handles currency symbols, commas, blanks', () => {
    expect(toNumber('$4.75')).toBe(4.75)
    expect(toNumber('1,234.50')).toBe(1234.5)
    expect(toNumber('')).toBeUndefined()
    expect(toNumber(undefined)).toBeUndefined()
    expect(toNumber('n/a')).toBeUndefined()
  })
})

describe('toIsoDate', () => {
  it('passes ISO through and truncates timestamps', () => {
    expect(toIsoDate('2026-05-12')).toBe('2026-05-12')
    expect(toIsoDate('2026-05-12T10:30:00Z')).toBe('2026-05-12')
  })
  it('parses human formats and returns undefined for junk', () => {
    expect(toIsoDate('May 12, 2026')).toBe('2026-05-12')
    expect(toIsoDate('not a date')).toBeUndefined()
    expect(toIsoDate('')).toBeUndefined()
  })
})
