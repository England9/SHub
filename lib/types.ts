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
  /** Star rating (0-5) when the source provides one. */
  rating?: number;
  /** Number of reviews when available. */
  reviews?: number;
  /** Delivery / shipping note when available, e.g. "Free delivery". */
  delivery?: string;
  /**
   * How this record was produced:
   *  - "live": real product data from the Google Shopping feed (via SerpAPI),
   *    with real photo, price, merchant and product link.
   *  - "scrape": parsed from the retailer's live HTML (JSON-LD).
   *  - "sample": generated catalog data used as a fallback when no live data
   *    source is configured / reachable.
   */
  source: "live" | "scrape" | "sample";
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
  /**
   * Overall data mode for this response:
   *  - "live": real product data (Google Shopping via SerpAPI).
   *  - "sample": generated fallback data (no live source configured/reachable).
   */
  mode: "live" | "sample";
  /** Human-readable note about the data mode (e.g. how to enable live data). */
  note?: string;
  /** Per-merchant/retailer breakdown, used to render filter chips. */
  retailers: Array<{
    key: string;
    name: string;
    count: number;
  }>;
  products: Product[];
}
