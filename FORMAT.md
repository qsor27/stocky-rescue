# Rescue Dataset Format

The rescue dataset is a zip archive containing CSV files, JSON documents, and a format manifest. All files are encoded in UTF-8.

## Format Version

`format_version: 1` — declared in `manifest.json`. Breaking changes to the column sets or data structures will increment this.

## Core Conventions

- **Dates** — ISO 8601 format: `YYYY-MM-DD`
- **Extra columns** — Any column from your original Stocky exports that the parser didn't recognize is preserved with an `x_` prefix (e.g., a custom column `internal_id` becomes `x_internal_id`). These are never dropped.
- **Empty fields** — Rendered as empty strings in CSVs; in `dataset.json` the key is omitted entirely (absent, never `null`) since the dataset is serialized with `JSON.stringify`, which drops `undefined` properties

## CSV Files

### purchase_orders.csv

One row per purchase order. Order-level extras are always empty by design — this file never carries `x_` columns; any column the parser doesn't recognize surfaces on `purchase_order_lines.csv` instead.

| Column | Type | Meaning |
|---|---|---|
| po_number | string | Unique purchase order identifier |
| supplier_name (optional) | string | Supplier name |
| status (optional) | string | PO status (e.g., "pending", "received") |
| created_date (optional) | string | ISO date when PO was created |
| ordered_date (optional) | string | ISO date when order was placed |
| received_date (optional) | string | ISO date when PO was fully received |
| currency (optional) | string | Currency code for this order |

### purchase_order_lines.csv

One row per line item within a purchase order.

| Column | Type | Meaning |
|---|---|---|
| po_number | string | References the PO this line belongs to |
| sku (optional) | string | Product SKU/code |
| product_title (optional) | string | Human-readable product name |
| qty_ordered (optional) | number | Quantity ordered |
| qty_received (optional) | number | Quantity received |
| unit_cost (optional) | number | Cost per unit |
| line_total (optional) | number | Total cost for this line, taken verbatim from the source file's total/line-total column — **not** computed as qty × unit_cost |

### stocktakes.csv

Stocktake reconciliation history from Stocky.

| Column | Type | Meaning |
|---|---|---|
| stocktake_ref (optional) | string | Unique identifier for this stocktake event |
| completed_date (optional) | string | ISO date when stocktake was completed |
| sku (optional) | string | Product SKU/code |
| qty_expected (optional) | number | System/expected quantity on hand |
| qty_counted (optional) | number | Actual quantity counted |
| qty_difference (optional) | number | Variance (counted − expected) |

### cost_history.csv

Every known cost event for each SKU (receipt-based from purchase orders and cost reports).

| Column | Type | Meaning |
|---|---|---|
| sku | string | Product SKU/code |
| date (optional) | string | ISO date of the cost event |
| qty (optional) | number | Quantity received or reported in this event |
| unit_cost | number | Cost per unit |
| source | string | `po_receipt` (from PO line item) or `cost_report` (from Stocky cost report) |

### suppliers.csv

Reconstructed supplier master list built from your purchase order history. **Stocky cannot export suppliers directly**, so this is rebuilt from PO data.

| Column | Type | Meaning |
|---|---|---|
| supplier_name | string | Supplier name |
| po_count | number | Number of POs placed with this supplier |
| total_spend (optional) | number | Sum of `line_total` across this supplier's PO lines; for any line where `line_total` is absent, falls back to `qty_ordered × unit_cost` for that line |
| first_order_date (optional) | string | ISO date of earliest PO |
| last_order_date (optional) | string | ISO date of most recent PO |
| avg_lead_time_days (optional) | number | Average days from PO order date to received date |
| currencies | string | Semicolon-separated list of currency codes seen (e.g., `USD;EUR;GBP`) |

### wac_report.csv

Per-SKU weighted-average cost analysis.

**Important caveat**: These figures are **receipt-based approximations**. True weighted-average cost (WAC) requires sales history — which Stocky does not export. What we compute here is cost-weighted by receipt quantities, not by actual sales. `value_*` columns are included only if you provided a Shopify products export (for on-hand inventory).

| Column | Type | Meaning |
|---|---|---|
| sku | string | Product SKU/code |
| receipt_count | number | Number of distinct cost/receipt events for this SKU |
| last_cost (optional) | number | Most recent unit cost received |
| last_cost_date (optional) | string | ISO date of the most recent cost event |
| avg_cost_all_time (optional) | number | Quantity-weighted average unit cost across all receipts |
| avg_cost_90d (optional) | number | Quantity-weighted average unit cost from receipts in the past 90 days |
| avg_cost_365d (optional) | number | Quantity-weighted average unit cost from receipts in the past 365 days |
| on_hand (optional) | number | Current on-hand quantity (from Shopify export, if provided) |
| value_at_last_cost (optional) | number | `on_hand × last_cost` |
| value_at_avg_all_time (optional) | number | `on_hand × avg_cost_all_time` |

### shopify_cost_import.csv (optional)

Present only when a Shopify products export was among the inputs AND at least one of its
SKUs matched a recovered cost. It is the merchant's own products export, round-tripped
verbatim — every original column and value preserved — with **`Cost per item`** set (or the
column appended) on rows whose `Variant SKU` matched. Cost basis: `last_cost`, falling back
to `avg_cost_all_time`, formatted to 2 decimals. Rows with no recovered cost are untouched.
Import via Shopify admin → Products → Import → "Overwrite products with matching handles".
Because it mirrors the source export, its columns are the merchant's, not this spec's.
When present, `manifest.json` gains `counts.shopify_cost_import_skus` (rows updated).

## JSON Files

### dataset.json

The complete rescue dataset as a single JSON document. Structure mirrors the TypeScript interfaces:

```json
{
  "purchase_orders": [
    {
      "po_number": "...",
      "supplier_name": "...",
      "status": "...",
      "created_date": "...",
      "ordered_date": "...",
      "received_date": "...",
      "currency": "...",
      "extras": {}
    }
  ],
  "purchase_order_lines": [
    {
      "po_number": "...",
      "sku": "...",
      "product_title": "...",
      "qty_ordered": 0,
      "qty_received": 0,
      "unit_cost": 0,
      "line_total": 0,
      "extras": {}
    }
  ],
  "stocktakes": [
    {
      "stocktake_ref": "...",
      "completed_date": "...",
      "sku": "...",
      "qty_expected": 0,
      "qty_counted": 0,
      "qty_difference": 0,
      "extras": {}
    }
  ],
  "cost_history": [
    {
      "sku": "...",
      "date": "...",
      "qty": 0,
      "unit_cost": 0,
      "source": "po_receipt" | "cost_report"
    }
  ],
  "suppliers": [
    {
      "supplier_name": "...",
      "po_count": 0,
      "total_spend": 0,
      "first_order_date": "...",
      "last_order_date": "...",
      "avg_lead_time_days": 0,
      "currencies": []
    }
  ],
  "wac_report": [
    {
      "sku": "...",
      "receipt_count": 0,
      "last_cost": 0,
      "last_cost_date": "...",
      "avg_cost_all_time": 0,
      "avg_cost_90d": 0,
      "avg_cost_365d": 0,
      "on_hand": 0,
      "value_at_last_cost": 0,
      "value_at_avg_all_time": 0
    }
  ],
  "sources": [
    {
      "filename": "...",
      "detected_type": "...",
      "rows": 0
    }
  ],
  "warnings": [
    {
      "level": "info" | "warn",
      "source": "...",
      "message": "..."
    }
  ]
}
```

### manifest.json

Metadata about the dataset and how it was generated.

| Field | Type | Meaning |
|---|---|---|
| tool | string | Always `stocky-rescue` |
| tool_version | string | Version of stocky-rescue that generated this dataset |
| format_version | number | Format version (currently `1`) |
| generated_at | string | ISO 8601 timestamp when the dataset was generated |
| sources | array | List of input files processed: `{ filename, detected_type, rows }` |
| counts | object | Row counts for each entity: `{ purchase_orders, purchase_order_lines, stocktakes, cost_history, suppliers, wac_report }` |
| warnings | array | Parsing warnings and info messages: `{ level: "info" \| "warn", source?: string, message }` |

### README.txt

Human-readable description of the dataset contents and format. Includes the receipt-based-approximation caveat for `wac_report.csv`.

---

## Using the Dataset

**To import into another system**, consume either the CSV files or `dataset.json`, whichever is more convenient for your target application. The CSV files preserve the order and column names for direct import; the JSON provides the same data with explicit type information.

**To preserve unrecognized columns**, use the full column list (including `x_*` prefixed columns) — tools that consume this dataset should treat `x_*` columns as user data from your Stocky exports.

**For a one-off analysis**, load `dataset.json` in Python, JavaScript, or your preferred language.
