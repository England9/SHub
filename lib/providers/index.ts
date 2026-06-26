import type { Gender, Product, SearchResponse } from "../types";
import { createProvider, type Provider } from "./base";
import { fetchGoogleShopping, getSerpApiKey } from "./googleShopping";

const enc = (s: string) => encodeURIComponent(s.trim());

/** Append a gender keyword to the query for retailers without a gender path. */
const withGender = (query: string, gender: Gender) =>
  gender === "all" ? query : `${gender === "men" ? "mens" : "womens"} ${query}`;

/**
 * Sample-data providers, one per retailer. These are only used as a fallback
 * when no live data source (SerpAPI) is configured or reachable, so the app is
 * still demonstrable offline.
 */
export const SAMPLE_PROVIDERS: Provider[] = [
  createProvider({
    meta: { key: "ssense", name: "SSENSE", color: "#000000" },
    basePrice: 160,
    attemptScrape: false,
    searchUrl: (q, g) =>
      `https://www.ssense.com/en-us/${g === "women" ? "women" : "men"}?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "offwhite", name: "Off-White", color: "#111111" },
    basePrice: 280,
    attemptScrape: false,
    searchUrl: (q) => `https://www.off---white.com/en-us/shopping?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "farfetch", name: "Farfetch", color: "#1f1f1f" },
    basePrice: 220,
    attemptScrape: false,
    searchUrl: (q) =>
      `https://www.farfetch.com/shopping/search/items.aspx?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "saks", name: "Saks Fifth Avenue", color: "#7a2230" },
    basePrice: 170,
    attemptScrape: false,
    searchUrl: (q) => `https://www.saksfifthavenue.com/search?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "nordstrom", name: "Nordstrom", color: "#1a1a1a" },
    basePrice: 95,
    attemptScrape: false,
    searchUrl: (q) => `https://www.nordstrom.com/sr?keyword=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "google", name: "Google Shopping", color: "#4285f4" },
    basePrice: 75,
    attemptScrape: false,
    searchUrl: (q, g) =>
      `https://www.google.com/search?tbm=shop&q=${enc(withGender(q, g))}`,
  }),
];

/** Static list used by the UI before any search is run. */
export const RETAILERS = SAMPLE_PROVIDERS.map((p) => p.meta);

/**
 * Main entry point. When a SerpAPI key is configured we return real Google
 * Shopping data (real photos, prices, merchants and product links). Otherwise
 * we fall back to deterministic sample data and flag the response as such.
 */
export async function aggregateSearch(
  query: string,
  gender: Gender,
): Promise<SearchResponse> {
  if (getSerpApiKey()) {
    try {
      const products = await fetchGoogleShopping(query, gender);
      if (products.length > 0) {
        return buildResponse(query, gender, "live", products);
      }
      return {
        ...buildResponse(query, gender, "live", []),
        note: "No live results found for this query.",
      };
    } catch (err) {
      // Fall back to sample data, but surface why live failed.
      const sample = await runSampleProviders(query, gender);
      return {
        ...buildResponse(query, gender, "sample", sample),
        note: `Live data error (${String(
          err instanceof Error ? err.message : err,
        )}); showing sample data.`,
      };
    }
  }

  const sample = await runSampleProviders(query, gender);
  return {
    ...buildResponse(query, gender, "sample", sample),
    note: "Live data is OFF. Add a SERPAPI_API_KEY to fetch real photos & prices from Google Shopping.",
  };
}

async function runSampleProviders(
  query: string,
  gender: Gender,
): Promise<Product[]> {
  const results = await Promise.all(
    SAMPLE_PROVIDERS.map((p) => p.search(query, gender)),
  );
  return results.flatMap((r) => r.products);
}

function buildResponse(
  query: string,
  gender: Gender,
  mode: "live" | "sample",
  products: Product[],
): SearchResponse {
  const interleaved = interleaveByRetailer(products);
  const counts = new Map<string, { name: string; count: number }>();
  for (const p of interleaved) {
    const entry = counts.get(p.retailerKey) ?? { name: p.retailer, count: 0 };
    entry.count += 1;
    counts.set(p.retailerKey, entry);
  }
  const retailers = [...counts.entries()]
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);

  return {
    query,
    gender,
    mode,
    count: interleaved.length,
    retailers,
    products: interleaved,
  };
}

/**
 * Interleave results across retailers so the grid reads like one unified
 * catalog rather than blocks grouped by store.
 */
function interleaveByRetailer(products: Product[]): Product[] {
  const byRetailer = new Map<string, Product[]>();
  for (const p of products) {
    const list = byRetailer.get(p.retailerKey) ?? [];
    list.push(p);
    byRetailer.set(p.retailerKey, list);
  }
  const queues = [...byRetailer.values()];
  const out: Product[] = [];
  let remaining = products.length;
  while (remaining > 0) {
    for (const q of queues) {
      const item = q.shift();
      if (item) {
        out.push(item);
        remaining--;
      }
    }
  }
  return out;
}
