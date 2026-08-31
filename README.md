# Stocky Rescue — free Stocky export rescue tool

**Recover your suppliers, costs, and purchase-order history from Shopify's Stocky app
before your data is gone.**

Shopify shut Stocky down on **August 31, 2026**. Per [Shopify's migration
guide](https://help.shopify.com/en/manual/products/inventory/transitioning-from-stocky),
you have **read-only access to export your data for at least 90 days** after that date —
roughly through the end of November 2026. After that, it's gone.

**→ Use the tool: https://qsor27.github.io/stocky-rescue/**

Everything runs in your browser. **Your files never leave your computer.** No uploads,
no accounts, no server. MIT licensed.

## What to export from Stocky (do this first, while you still can)

1. **Purchase orders** — Stocky → Purchase Orders → Export All (CSV)
2. **Stocktakes** — Stocky → Reports → stocktake history (CSV)
3. **Historical costs** — Stocky → Reports → cost report (CSV)
4. Optional: **Products** — Shopify admin → Products → Export (adds on-hand valuation)

## What you get back

One zip — the **rescue dataset** ([format documented here](FORMAT.md)):

- clean, normalized CSVs of your POs, PO lines, stocktakes, and cost history
- **`suppliers.csv`** — your supplier list *reconstructed from PO history* (PO count,
  total spend, first/last order, average lead time). Stocky cannot export suppliers;
  this rebuilds them from what it can export.
- **`wac_report.csv`** — per-SKU cost analytics (last cost, receipt-weighted averages,
  valuation), honestly labeled as receipt-based approximations
- `dataset.json` + `manifest.json` for anything programmatic

Columns the tool doesn't recognize are preserved with an `x_` prefix — never dropped.

## My file didn't parse

Stocky never published a format spec, so the parsers are alias-based and tolerant — but
real exports will surprise us. Please [open a format-sample
issue](../../issues/new?template=format-sample.yml) with a few redacted rows and we'll
add support quickly.

## Request an importer

The rescue dataset is an open format any tool can consume. Want a ready-made import for
your replacement app? 👍 an existing request or open a new one — most-requested gets
built first:

| Destination | Request |
|---|---|
| QuickBooks Online | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+QuickBooks+Online) |
| Xero | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Xero) |
| Prediko | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Prediko) |
| Fabrikator | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Fabrikator) |
| inFlow | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+inFlow) |
| Canopy | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Canopy) |
| Genie | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Genie) |
| Stocksmith | [request](../../issues/new?template=importer-request.yml&title=Importer%3A+Stocksmith) |
| Something else | [request](../../issues/new?template=importer-request.yml) |

## Need hands-on help?

[SC Technology](https://sctechnology.net/?ref=stocky-rescue) does Stocky migrations and
QuickBooks/Xero costing integration as a service.

## Development

```bash
npm install
npm test        # vitest
npm run dev     # local dev server
npm run build   # static build in dist/
```

Core logic lives in `src/core/` (pure TypeScript, no DOM) — parsers, derivations,
emitters. The page in `src/app/` is a thin wrapper. PRs welcome, tests required.
