import type { CostEvent, InputFile, ProductStock, RescueDataset, Warning } from './model'
import { parseCsv } from './csv'
import { detectFileType } from './detect'
import { parsePurchaseOrders } from './parse/purchaseOrders'
import { parseStocktakes } from './parse/stocktakes'
import { parseCostReport } from './parse/costs'
import { parseShopifyProducts } from './parse/shopifyProducts'
import { deriveSuppliers } from './derive/suppliers'
import { deriveWac } from './derive/wac'
import { buildZip } from './emit/zip'

export interface RescueResult {
  dataset: RescueDataset
  zipBlob: Blob
}

export async function rescue(files: InputFile[], now: Date): Promise<RescueResult> {
  const dataset: RescueDataset = {
    purchase_orders: [],
    purchase_order_lines: [],
    stocktakes: [],
    cost_history: [],
    suppliers: [],
    wac_report: [],
    sources: [],
    warnings: [],
  }
  const stock: ProductStock[] = []
  const costEvents: CostEvent[] = []
  const seenPoNumbers = new Set<string>()
  let unknownPoContributed = false

  for (const file of files) {
    let type = 'unknown'
    try {
      const { headers, rows } = parseCsv(file.text)
      type = detectFileType(headers)
      if (type === 'stocky_po') {
        const r = parsePurchaseOrders(file)
        const droppedPoNumbers = new Set<string>()
        const rewrittenPoNumbers = new Map<string, string>()
        const keptOrders = []
        for (const order of r.orders) {
          if (order.po_number === '(unknown)') {
            if (unknownPoContributed) {
              const rewritten = `(unknown) [${file.name}]`
              rewrittenPoNumbers.set('(unknown)', rewritten)
              keptOrders.push({ ...order, po_number: rewritten })
            } else {
              unknownPoContributed = true
              keptOrders.push(order)
            }
          } else if (seenPoNumbers.has(order.po_number)) {
            droppedPoNumbers.add(order.po_number)
            dataset.warnings.push({
              level: 'warn',
              source: file.name,
              message: `${file.name}: duplicate purchase order ${order.po_number} ignored (already loaded from an earlier file).`,
            })
          } else {
            seenPoNumbers.add(order.po_number)
            keptOrders.push(order)
          }
        }
        const keptLines = r.lines
          .filter((l) => !droppedPoNumbers.has(l.po_number))
          .map((l) =>
            rewrittenPoNumbers.has(l.po_number)
              ? { ...l, po_number: rewrittenPoNumbers.get(l.po_number)! }
              : l,
          )
        dataset.purchase_orders.push(...keptOrders)
        dataset.purchase_order_lines.push(...keptLines)
        costEvents.push(...r.costEvents)
        dataset.warnings.push(...r.warnings)
      } else if (type === 'stocky_stocktake') {
        const r = parseStocktakes(file)
        dataset.stocktakes.push(...r.stocktakes)
        dataset.warnings.push(...r.warnings)
      } else if (type === 'stocky_cost') {
        const r = parseCostReport(file)
        costEvents.push(...r.costEvents)
        dataset.warnings.push(...r.warnings)
      } else if (type === 'shopify_products') {
        const r = parseShopifyProducts(file)
        stock.push(...r.stock)
        dataset.warnings.push(...r.warnings)
      } else {
        dataset.warnings.push({
          level: 'warn',
          source: file.name,
          message: `${file.name}: headers not recognized as any Stocky/Shopify export — file skipped. Please open a "format sample" issue on GitHub with a redacted sample.`,
        })
      }
      dataset.sources.push({ filename: file.name, detected_type: type, rows: rows.length })
    } catch (err) {
      dataset.warnings.push({
        level: 'warn',
        source: file.name,
        message: `${file.name}: failed to parse (${err instanceof Error ? err.message : String(err)}) — file skipped.`,
      })
      dataset.sources.push({ filename: file.name, detected_type: type, rows: 0 })
    }
  }

  costEvents.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  dataset.cost_history = costEvents
  dataset.suppliers = deriveSuppliers(dataset.purchase_orders, dataset.purchase_order_lines)
  dataset.wac_report = deriveWac(costEvents, stock, now)

  const zipBlob = await buildZip(dataset, now)
  return { dataset, zipBlob }
}
