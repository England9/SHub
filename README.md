# SHub

**One catalog. Every store.** SHub aggregates products from multiple online
retailers — SSENSE, Off-White, Farfetch, Saks Fifth Avenue, Nordstrom and
Google Shopping — into a single searchable catalog. Search once (e.g.
`OFF-WHITE Mens shirt`) and see images, prices, sizes and stock from every
store side by side, with a redirect button to buy on the real site.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`.

## How it works

A search hits `GET /api/search?q=<query>&gender=<men|women|all>`, which fans the
query out to one provider per retailer in parallel (`lib/providers/`). Each
provider first attempts a live scrape of the retailer's search page (parsing
embedded schema.org JSON-LD), and falls back to a deterministic sample catalog
when live scraping is blocked. Results are merged and interleaved into one grid.

> Note: the listed retailers use aggressive anti-bot protection and JS-rendered
> pages, so live scraping typically requires a proxy/API key. Out of the box the
> app returns sample catalog data (badged "Sample"), while the **"Go to site"**
> redirect buttons always link to the real retailer search results.

