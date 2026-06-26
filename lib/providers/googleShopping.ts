import type { Gender, Product } from "../types";

/**
 * Raw shape of a single item in SerpAPI's `google_shopping` `shopping_results`.
 * Only the fields we consume are typed; the API returns more.
 * See: https://serpapi.com/google-shopping-api
 */
interface SerpShoppingResult {
  position?: number;
  title?: string;
  product_link?: string;
  link?: string;
  product_id?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
  second_hand_condition?: string;
}

interface SerpResponse {
  error?: string;
  shopping_results?: SerpShoppingResult[];
}

export function slugifyMerchant(source: string): string {
  return (
    source
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other"
  );
}

/**
 * Convert a SerpAPI Google Shopping response into our unified Product list.
 * Exported separately so it can be unit-tested against a static fixture
 * without making a network call.
 */
export function mapSerpResults(json: SerpResponse): Product[] {
  const items = json.shopping_results ?? [];
  const products: Product[] = [];

  items.forEach((item, i) => {
    if (!item.title || !item.thumbnail) return;
    const merchant = (item.source ?? "Google Shopping").trim();
    const price =
      typeof item.extracted_price === "number"
        ? item.extracted_price
        : parsePrice(item.price);

    products.push({
      id: item.product_id ?? `gs-${i}`,
      title: item.title,
      brand: merchant,
      price,
      currency: "USD",
      image: item.thumbnail,
      images: item.thumbnail ? [item.thumbnail] : [],
      sizes: [],
      // The shopping feed lists purchasable offers, so treat as in stock.
      inStock: true,
      retailer: merchant,
      retailerKey: slugifyMerchant(merchant),
      url: item.product_link ?? item.link ?? "#",
      rating: item.rating,
      reviews: item.reviews,
      delivery: item.delivery,
      source: "live",
    });
  });

  return products;
}

function parsePrice(price?: string): number | null {
  if (!price) return null;
  const m = price.replace(/,/g, "").match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

const SERP_ENDPOINT = "https://serpapi.com/search.json";

/** Returns the configured SerpAPI key, if any. */
export function getSerpApiKey(): string | undefined {
  const key = process.env.SERPAPI_API_KEY ?? process.env.SERP_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
}

/**
 * Fetch real product data from Google Shopping via SerpAPI. Throws on missing
 * key, network error, or API error so the caller can fall back to sample data.
 */
export async function fetchGoogleShopping(
  query: string,
  gender: Gender,
  timeoutMs = 12000,
): Promise<Product[]> {
  const apiKey = getSerpApiKey();
  if (!apiKey) throw new Error("SERPAPI_API_KEY not configured");

  const q = gender === "all" ? query : `${gender === "men" ? "mens" : "womens"} ${query}`;
  const params = new URLSearchParams({
    engine: "google_shopping",
    q,
    api_key: apiKey,
    gl: "us",
    hl: "en",
    num: "60",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SERP_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    const json = (await res.json()) as SerpResponse;
    if (!res.ok || json.error) {
      throw new Error(json.error ?? `SerpAPI HTTP ${res.status}`);
    }
    return mapSerpResults(json);
  } finally {
    clearTimeout(timer);
  }
}
