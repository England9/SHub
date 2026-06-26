export type Gender = "men" | "women" | "all";

export interface Product {
  /** Stable id, unique within a search response. */
  id: string;
  title: string;
  brand: string;
  /** Numeric price in the smallest sensible unit of `currency` (e.g. dollars). Null when unknown. */
  price: number | null;
  currency: string;
  /** Primary image URL. */
  image: string;
  /** Additional image URLs (optional). */
  images?: string[];
  /** Available sizes, e.g. ["S", "M", "L"]. */
  sizes: string[];
  inStock: boolean;
  /** Human-readable retailer name, e.g. "SSENSE". */
  retailer: string;
  /** Machine key for the retailer, e.g. "ssense". */
  retailerKey: string;
  /** Deep link to the product (or retailer search results) on the real website. */
  url: string;
  /**
   * How this record was produced:
   *  - "scrape": parsed from the retailer's live HTML.
   *  - "sample": generated catalog data used as a fallback when live scraping is
   *    blocked (anti-bot protection, JS-rendered content, missing proxy, etc.).
   */
  source: "scrape" | "sample";
}

export interface RetailerMeta {
  key: string;
  name: string;
  /** Brand color used for the retailer chip/badge in the UI. */
  color: string;
}

export interface SearchResponse {
  query: string;
  gender: Gender;
  count: number;
  /** Per-retailer status, useful for surfacing scrape failures in the UI. */
  retailers: Array<{
    key: string;
    name: string;
    count: number;
    source: "scrape" | "sample" | "error";
    note?: string;
  }>;
  products: Product[];
}
