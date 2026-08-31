import JSZip from 'jszip'
import type { RescueDataset } from '../model'
import { datasetTables } from './tables'

const DATASET_README = `STOCKY RESCUE DATASET
=====================
Produced by stocky-rescue (open source, MIT). Format version 1.
Everything was generated locally in your browser from the files you provided.

Files:
- purchase_orders.csv ......... one row per purchase order
- purchase_order_lines.csv .... one row per PO line item (SKU, quantities, costs)
- stocktakes.csv .............. your stocktake history
- cost_history.csv ............ every known receiving/cost event per SKU
- suppliers.csv ............... RECONSTRUCTED supplier list (Stocky cannot export
                                suppliers; this is rebuilt from your PO history:
                                PO count, total spend, first/last order, average
                                lead time in days, currencies seen)
- wac_report.csv .............. per-SKU cost analytics. IMPORTANT: these are
                                RECEIPT-BASED APPROXIMATIONS (true weighted-average
                                cost needs sales history, which Stocky does not
                                export). last_cost = most recent receipt cost;
                                avg_cost_* = receipt-weighted averages over the
                                named window; value_* = on-hand quantity times the
                                named cost basis (only if you provided a Shopify
                                products export).
- dataset.json ................ the entire dataset as one JSON document
- manifest.json ............... tool version, source files, row counts, warnings

Columns starting with "x_" are columns from your original files that the tool
did not recognize — preserved verbatim, never dropped.
`

export async function buildZip(d: RescueDataset, generatedAt: Date): Promise<Blob> {
  const zip = new JSZip()
  for (const [name, csv] of Object.entries(datasetTables(d))) zip.file(name, csv)
  zip.file('dataset.json', JSON.stringify(d, null, 2))
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        tool: 'stocky-rescue',
        tool_version: '0.1.0',
        format_version: 1,
        generated_at: generatedAt.toISOString(),
        sources: d.sources,
        counts: {
          purchase_orders: d.purchase_orders.length,
          purchase_order_lines: d.purchase_order_lines.length,
          stocktakes: d.stocktakes.length,
          cost_history: d.cost_history.length,
          suppliers: d.suppliers.length,
          wac_report: d.wac_report.length,
        },
        warnings: d.warnings,
      },
      null,
      2,
    ),
  )
  zip.file('README.txt', DATASET_README)
  return zip.generateAsync({ type: 'blob' })
}
