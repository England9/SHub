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

## Real data (photos + prices)

SHub gets **real product photos, prices, merchants and links** from **Google
Shopping via [SerpAPI](https://serpapi.com)**, which already aggregates SSENSE,
Off-White, Farfetch, Saks, Nordstrom and other merchants in one feed.

1. Get a free SerpAPI key (free tier: 100 searches/month).
2. Add it to the environment:

   ```bash
   echo "SERPAPI_API_KEY=your_key_here" > .env.local
   npm run dev
   ```

When the key is set, searches run in **Live** mode (green banner) with real
data. Without a key, the app runs in **Sample** mode (amber banner) using
deterministic placeholder data so it's still demoable offline.

> Why not scrape the sites directly? SSENSE/Farfetch/Saks/Nordstrom/Off-White
> use Cloudflare/Akamai bot protection and render via JS, so server-side
> scraping from a datacenter IP is blocked. Google Shopping (via SerpAPI) is the
> reliable way to get real, aggregated data.

## How it works

A search hits `GET /api/search?q=<query>&gender=<men|women|all>` →
`aggregateSearch` (`lib/providers/index.ts`). In live mode it calls
`fetchGoogleShopping` (`lib/providers/googleShopping.ts`) and maps the SerpAPI
response into a unified `Product[]`, grouped/badged by merchant. In sample mode
it builds a deterministic catalog instead. Results are interleaved into one grid.

