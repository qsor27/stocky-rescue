import { describe, it, expect } from 'vitest'
import type { CostEvent } from '../model'
import { deriveWac } from './wac'

const NOW = new Date('2026-08-31T00:00:00Z')

const events: CostEvent[] = [
  { sku: 'TSHIRT-S', date: '2026-04-01', qty: 5, unit_cost: 4.2, source: 'cost_report' },
  { sku: 'TSHIRT-S', date: '2026-05-12', qty: 10, unit_cost: 4.5, source: 'po_receipt' },
  { sku: 'JEAN-32', date: '2026-06-25', qty: 15, unit_cost: 12, source: 'po_receipt' },
]

describe('deriveWac', () => {
  it('computes last cost and weighted averages per sku', () => {
    const rows = deriveWac(events, [], NOW)
    expect(rows.map((r) => r.sku)).toEqual(['JEAN-32', 'TSHIRT-S'])

    const tee = rows[1]!
    expect(tee.receipt_count).toBe(2)
    expect(tee.last_cost).toBe(4.5)
    expect(tee.last_cost_date).toBe('2026-05-12')
    // (5*4.20 + 10*4.50) / 15 = 4.40
    expect(tee.avg_cost_all_time).toBe(4.4)
    // both events older than 90 days before 2026-08-31
    expect(tee.avg_cost_90d).toBeUndefined()
    expect(tee.avg_cost_365d).toBe(4.4)

    const jean = rows[0]!
    expect(jean.avg_cost_90d).toBe(12) // 2026-06-25 is within 90 days
  })

  it('adds valuation when stock is provided', () => {
    const rows = deriveWac(events, [{ sku: 'TSHIRT-S', on_hand: 25 }], NOW)
    const tee = rows.find((r) => r.sku === 'TSHIRT-S')!
    expect(tee.on_hand).toBe(25)
    expect(tee.value_at_last_cost).toBe(112.5)
    expect(tee.value_at_avg_all_time).toBe(110)
  })

  it('handles events without qty (excluded from averages, counted for last cost)', () => {
    const rows = deriveWac(
      [{ sku: 'X', date: '2026-08-30', unit_cost: 9, source: 'cost_report' }],
      [],
      NOW,
    )
    expect(rows[0]).toMatchObject({ sku: 'X', receipt_count: 1, last_cost: 9 })
    expect(rows[0]!.avg_cost_all_time).toBeUndefined()
  })
})
