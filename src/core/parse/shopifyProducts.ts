import { parseCsv, buildColumnMap, toNumber } from '../csv'
import type { InputFile, ProductStock, Warning } from '../model'

const ALIASES: Record<string, string[]> = {
  sku: ['variantsku', 'sku'],
  product_title: ['title', 'name'],
  on_hand: ['variantinventoryqty', 'inventoryquantity', 'onhand', 'available', 'quantity'],
}

export function parseShopifyProducts(file: InputFile): { stock: ProductStock[]; warnings: Warning[] } {
  const warnings: Warning[] = []
  const { headers, rows } = parseCsv(file.text)
  const col = buildColumnMap(headers, ALIASES)

  const get = (row: Record<string, string>, field: string): string | undefined => {
    const h = col[field]
    const v = h === undefined ? undefined : row[h]
    return v === undefined || v.trim() === '' ? undefined : v.trim()
  }

  const stock: ProductStock[] = []
  for (const row of rows) {
    const sku = get(row, 'sku')
    if (sku === undefined) continue
    stock.push({ sku, product_title: get(row, 'product_title'), on_hand: toNumber(get(row, 'on_hand')) })
  }
  return { stock, warnings }
}
