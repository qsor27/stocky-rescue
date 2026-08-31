import { normalizeHeader } from './csv'

export type FileType =
  | 'stocky_po'
  | 'stocky_stocktake'
  | 'stocky_cost'
  | 'shopify_products'
  | 'unknown'

export function detectFileType(headers: string[]): FileType {
  const set = new Set(headers.map(normalizeHeader))
  const hasAny = (...names: string[]) => names.some((n) => set.has(n))

  if (hasAny('handle') && hasAny('variantsku', 'sku')) return 'shopify_products'
  if (hasAny('supplier', 'vendor', 'suppliername') || hasAny('ponumber', 'purchaseorder', 'po'))
    return 'stocky_po'
  if (hasAny('counted', 'countedquantity', 'stocktake', 'expected', 'expectedquantity'))
    return 'stocky_stocktake'
  if (hasAny('sku', 'variantsku') && hasAny('cost', 'costprice', 'unitcost')) return 'stocky_cost'
  return 'unknown'
}
