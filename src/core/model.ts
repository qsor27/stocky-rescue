export interface Warning {
  level: 'info' | 'warn'
  source?: string // filename
  message: string
}

export interface InputFile {
  name: string
  text: string
}

export interface PurchaseOrder {
  po_number: string
  supplier_name?: string
  status?: string
  created_date?: string
  ordered_date?: string
  received_date?: string
  currency?: string
  extras: Record<string, string>
}

export interface PurchaseOrderLine {
  po_number: string
  sku?: string
  product_title?: string
  qty_ordered?: number
  qty_received?: number
  unit_cost?: number
  line_total?: number
  extras: Record<string, string>
}

export interface StocktakeRow {
  stocktake_ref?: string
  completed_date?: string
  sku?: string
  qty_expected?: number
  qty_counted?: number
  qty_difference?: number
  extras: Record<string, string>
}

export interface CostEvent {
  sku: string
  date?: string
  qty?: number
  unit_cost: number
  source: 'po_receipt' | 'cost_report'
}

export interface Supplier {
  supplier_name: string
  po_count: number
  total_spend?: number
  first_order_date?: string
  last_order_date?: string
  avg_lead_time_days?: number
  currencies: string[]
}

export interface WacRow {
  sku: string
  receipt_count: number
  last_cost?: number
  last_cost_date?: string
  avg_cost_all_time?: number
  avg_cost_90d?: number
  avg_cost_365d?: number
  on_hand?: number
  value_at_last_cost?: number
  value_at_avg_all_time?: number
}

export interface ProductStock {
  sku: string
  product_title?: string
  on_hand?: number
}

export interface RescueDataset {
  purchase_orders: PurchaseOrder[]
  purchase_order_lines: PurchaseOrderLine[]
  stocktakes: StocktakeRow[]
  cost_history: CostEvent[]
  suppliers: Supplier[]
  wac_report: WacRow[]
  sources: { filename: string; detected_type: string; rows: number }[]
  warnings: Warning[]
}
