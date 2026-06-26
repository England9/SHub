import type { Product } from "./types";

/**
 * Deterministic pseudo-random generator so a given (query, retailer) pair
 * always yields the same sample catalog between requests.
 */
function makeRng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const PRODUCT_TYPES = [
  "Shirt",
  "T-Shirt",
  "Hoodie",
  "Sweatshirt",
  "Jacket",
  "Cargo Pants",
  "Sneakers",
  "Cap",
  "Belt",
  "Knit Sweater",
];

const DESCRIPTORS = [
  "Logo",
  "Diag Stripe",
  "Arrow",
  "Industrial",
  "Caravaggio",
  "Helvetica",
  "Quote",
  "Graffiti",
  "Marker",
  "Bookish",
];

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** Pull a likely brand out of the query, defaulting to "Off-White". */
function inferBrand(query: string): string {
  const q = query.toLowerCase();
  const known: Array<[string, string]> = [
    ["off-white", "Off-White"],
    ["off white", "Off-White"],
    ["nike", "Nike"],
    ["adidas", "adidas"],
    ["gucci", "Gucci"],
    ["prada", "Prada"],
    ["balenciaga", "Balenciaga"],
    ["stone island", "Stone Island"],
    ["amiri", "AMIRI"],
    ["fear of god", "Fear of God"],
    ["essentials", "Fear of God ESSENTIALS"],
  ];
  for (const [needle, brand] of known) {
    if (q.includes(needle)) return brand;
  }
  // Fall back to the first capitalized-looking token.
  const token = query.trim().split(/\s+/)[0];
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : "Off-White";
}

/** Pull a product type hint out of the query if present. */
function inferType(query: string): string | null {
  const q = query.toLowerCase();
  for (const t of PRODUCT_TYPES) {
    if (q.includes(t.toLowerCase())) return t;
  }
  if (q.includes("tee")) return "T-Shirt";
  if (q.includes("trainer")) return "Sneakers";
  return null;
}

export interface SampleOptions {
  query: string;
  retailerKey: string;
  retailerName: string;
  /** Real retailer search URL used as the redirect target for each card. */
  searchUrl: string;
  count?: number;
  /** Base price floor for the retailer (luxury sites skew higher). */
  basePrice?: number;
}

/**
 * Generate a plausible sample catalog for a retailer + query. Used as a
 * graceful fallback whenever live scraping returns nothing (which is the
 * common case from a server without residential proxies, since these
 * retailers use aggressive anti-bot protection and render via JS).
 */
export function generateSampleProducts(opts: SampleOptions): Product[] {
  const {
    query,
    retailerKey,
    retailerName,
    searchUrl,
    count = 6,
    basePrice = 120,
  } = opts;

  const rng = makeRng(`${retailerKey}:${query.toLowerCase()}`);
  const brand = inferBrand(query);
  const typeHint = inferType(query);
  const products: Product[] = [];

  for (let i = 0; i < count; i++) {
    const type =
      typeHint ?? PRODUCT_TYPES[Math.floor(rng() * PRODUCT_TYPES.length)];
    const descriptor =
      DESCRIPTORS[Math.floor(rng() * DESCRIPTORS.length)];
    const price =
      Math.round((basePrice + rng() * basePrice * 3) / 5) * 5 - 1 + 0.99;
    const sizeCount = 2 + Math.floor(rng() * (ALL_SIZES.length - 2));
    const start = Math.floor(rng() * (ALL_SIZES.length - sizeCount));
    const sizes = ALL_SIZES.slice(start, start + sizeCount);
    const inStock = rng() > 0.18;
    const seed = `${retailerKey}-${query}-${i}`.replace(/\s+/g, "-");
    const image = `https://picsum.photos/seed/${encodeURIComponent(
      seed,
    )}/480/600`;

    products.push({
      id: `${retailerKey}-${i}`,
      title: `${descriptor} ${type}`,
      brand,
      price: Math.round(price * 100) / 100,
      currency: "USD",
      image,
      images: [image],
      sizes,
      inStock,
      retailer: retailerName,
      retailerKey,
      url: searchUrl,
      source: "sample",
    });
  }

  return products;
}
