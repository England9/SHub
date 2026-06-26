import type { Gender, Product, SearchResponse } from "../types";
import { createProvider, type Provider } from "./base";

const enc = (s: string) => encodeURIComponent(s.trim());

/** Append a gender keyword to the query for retailers without a gender path. */
const withGender = (query: string, gender: Gender) =>
  gender === "all" ? query : `${gender === "men" ? "mens" : "womens"} ${query}`;

export const PROVIDERS: Provider[] = [
  createProvider({
    meta: { key: "ssense", name: "SSENSE", color: "#000000" },
    basePrice: 160,
    searchUrl: (q, g) =>
      `https://www.ssense.com/en-us/${g === "women" ? "women" : "men"}?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "offwhite", name: "Off-White", color: "#111111" },
    basePrice: 280,
    searchUrl: (q) => `https://www.off---white.com/en-us/shopping?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "farfetch", name: "Farfetch", color: "#1f1f1f" },
    basePrice: 220,
    searchUrl: (q) =>
      `https://www.farfetch.com/shopping/search/items.aspx?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "saks", name: "Saks Fifth Avenue", color: "#7a2230" },
    basePrice: 170,
    searchUrl: (q) => `https://www.saksfifthavenue.com/search?q=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "nordstrom", name: "Nordstrom", color: "#1a1a1a" },
    basePrice: 95,
    searchUrl: (q) => `https://www.nordstrom.com/sr?keyword=${enc(q)}`,
  }),
  createProvider({
    meta: { key: "google", name: "Google Shopping", color: "#4285f4" },
    basePrice: 75,
    searchUrl: (q, g) =>
      `https://www.google.com/search?tbm=shop&q=${enc(withGender(q, g))}`,
  }),
];

export const RETAILERS = PROVIDERS.map((p) => p.meta);

const PROVIDER_TIMEOUT_MS = 9000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * Fan out a query to every provider in parallel and merge into a single
 * unified catalog. Individual provider failures never fail the whole search.
 */
export async function aggregateSearch(
  query: string,
  gender: Gender,
): Promise<SearchResponse> {
  const settled = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const result = await withTimeout(
        provider.search(query, gender),
        PROVIDER_TIMEOUT_MS,
        {
          products: [] as Product[],
          source: "error" as const,
          note: "Timed out",
        },
      );
      return { provider, result };
    }),
  );

  const products: Product[] = [];
  const retailers: SearchResponse["retailers"] = [];

  for (const { provider, result } of settled) {
    products.push(...result.products);
    retailers.push({
      key: provider.meta.key,
      name: provider.meta.name,
      count: result.products.length,
      source: result.source,
      note: result.note,
    });
  }

  // Interleave results across retailers so the grid feels like one catalog
  // rather than blocks grouped by store.
  const interleaved = interleaveByRetailer(products);

  return {
    query,
    gender,
    count: interleaved.length,
    retailers,
    products: interleaved,
  };
}

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
