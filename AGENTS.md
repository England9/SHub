# SHub

SHub is a unified shopping catalog. A single search fans out to multiple
retailers (SSENSE, Off-White, Farfetch, Saks Fifth Avenue, Nordstrom, Google
Shopping) and merges everything into one product grid with image, price, sizes,
stock and a "Go to site" redirect button to the real retailer.

## Architecture

- **Next.js 14 (App Router) + TypeScript + Tailwind** — single full-stack app.
- `app/page.tsx` — client search UI (search bar, gender toggle, retailer filter chips, product grid).
- `app/api/search/route.ts` — `GET /api/search?q=<query>&gender=<men|women|all>`; calls `aggregateSearch`.
- `lib/providers/` — one provider per retailer. `index.ts` holds the registry and `aggregateSearch` (parallel fan-out with per-provider timeout + interleave).
- `lib/providers/base.ts` — `createProvider` factory: attempts a live JSON-LD scrape, then falls back to sample data.
- `lib/scrape.ts` — `fetchHtml` (browser UA + timeout) and `extractJsonLdProducts` (schema.org Product parser).
- `lib/sample.ts` — deterministic sample-catalog generator used as the fallback.

## Cursor Cloud specific instructions

- Standard scripts live in `package.json`: `npm run dev` (port 3000), `npm run build`, `npm run lint`, `npm test` (Node built-in test runner via `--experimental-strip-types`, no extra deps).
- **Live vs sample data is controlled by the `SERPAPI_API_KEY` secret/env var:**
  - When set, `aggregateSearch` calls Google Shopping via SerpAPI (`lib/providers/googleShopping.ts`) and returns **real photos, prices, merchants and product links** (`mode: "live"`, green banner in the UI).
  - When unset, it falls back to the deterministic **sample** catalog in `lib/providers/index.ts` (`mode: "sample"`, amber banner). A populated 36-item grid in sample mode is the expected healthy offline state.
- **Direct HTML scraping of the retailers does NOT work from the Cloud VM** (verified): SSENSE returns a Cloudflare 403 challenge, Google Shopping 302-redirects to a consent wall, and Nordstrom's 200 response is an Akamai JS shell with no product data. This is why live data goes through SerpAPI (Google Shopping aggregates SSENSE/Off-White/Farfetch/Saks/Nordstrom as merchant "sources"), not per-site scraping. Don't waste time trying to revive direct scraping without residential proxies + a headless browser.
- SerpAPI free tier is 100 searches/month — avoid burning quota in loops/tests. The SerpAPI parser is covered by `tests/serp-parse.test.ts` using a static fixture (no network, no quota used).
- The Google Shopping feed does not include sizes or true per-variant stock, so cards omit size chips in live mode and show rating/delivery instead; the "Go to site" link opens the real product page for sizes/stock.
- Images (SerpAPI thumbnails in live mode, `picsum.photos` in sample mode) require outbound internet from the browser/VM to render.
