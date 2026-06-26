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

- Standard scripts live in `package.json`: `npm run dev` (port 3000), `npm run build`, `npm run lint`. There is no test suite.
- Scraping reality: the target retailers (SSENSE, Farfetch, Saks, Nordstrom, Off-White, Google Shopping) use aggressive anti-bot protection and render products via JavaScript, so the server-side JSON-LD scrape almost always returns nothing from the Cloud VM (no residential proxies). Each provider therefore falls back to a deterministic **sample** catalog and the API marks those results `source: "sample"` (the UI shows an amber "Sample" badge). This is expected, not a bug — a populated grid with all 6 retailers reporting `count: 6` is the correct healthy state here.
- The product **redirect URLs are always real** retailer search URLs (e.g. `ssense.com/en-us/men?q=...`), so the "Go to site" button works end-to-end regardless of whether scraping succeeded.
- Sample product images are served from `picsum.photos`; rendering the grid requires outbound internet from the browser/VM.
- To enable real product data later, plug API keys / a proxy into the providers in `lib/providers/index.ts` (or swap Google Shopping for a SERP API) — no other layers need to change.
