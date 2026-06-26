import type { Gender, Product, RetailerMeta } from "../types";
import { generateSampleProducts } from "../sample";
import { extractJsonLdProducts, fetchHtml } from "../scrape";

export interface ProviderResult {
  products: Product[];
  source: "scrape" | "sample" | "error";
  note?: string;
}

export interface Provider {
  meta: RetailerMeta;
  /** The real, user-facing search URL for the query (redirect target). */
  searchUrl(query: string, gender: Gender): string;
  search(query: string, gender: Gender): Promise<ProviderResult>;
}

export interface ProviderConfig {
  meta: RetailerMeta;
  searchUrl: (query: string, gender: Gender) => string;
  /** Floor price used when generating sample data for this retailer. */
  basePrice?: number;
  /** Number of sample products to generate when live scraping is unavailable. */
  sampleCount?: number;
  /** Whether to attempt a live scrape before falling back to sample data. */
  attemptScrape?: boolean;
}

/**
 * Builds a Provider that first attempts a live JSON-LD scrape of the retailer's
 * search page and, if that yields nothing usable, falls back to a deterministic
 * sample catalog so the aggregated experience always returns results.
 */
export function createProvider(config: ProviderConfig): Provider {
  const {
    meta,
    searchUrl,
    basePrice = 120,
    sampleCount = 6,
    attemptScrape = true,
  } = config;

  return {
    meta,
    searchUrl,
    async search(query: string, gender: Gender): Promise<ProviderResult> {
      const url = searchUrl(query, gender);

      if (attemptScrape) {
        try {
          const html = await fetchHtml(url);
          if (html) {
            const scraped = mapJsonLd(html, meta, url);
            if (scraped.length > 0) {
              return { products: scraped, source: "scrape" };
            }
          }
        } catch {
          // fall through to sample data
        }
      }

      const products = generateSampleProducts({
        query,
        retailerKey: meta.key,
        retailerName: meta.name,
        searchUrl: url,
        count: sampleCount,
        basePrice,
      });
      return {
        products,
        source: "sample",
        note: "Live scrape unavailable (anti-bot / JS-rendered); showing sample catalog.",
      };
    },
  };
}

function mapJsonLd(
  html: string,
  meta: RetailerMeta,
  searchUrl: string,
): Product[] {
  const partials = extractJsonLdProducts(html);
  return partials
    .filter((p) => p.title && p.image)
    .slice(0, 12)
    .map((p, i) => ({
      id: `${meta.key}-${i}`,
      title: p.title as string,
      brand: p.brand ?? meta.name,
      price: p.price ?? null,
      currency: p.currency ?? "USD",
      image: p.image as string,
      images: p.image ? [p.image as string] : [],
      sizes: [],
      inStock: p.inStock ?? true,
      retailer: meta.name,
      retailerKey: meta.key,
      url: p.url ?? searchUrl,
      source: "scrape" as const,
    }));
}
