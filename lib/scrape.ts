import * as cheerio from "cheerio";
import type { Product } from "./types";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Fetch a URL's HTML with a browser-like User-Agent and a hard timeout.
 * Returns null on any failure (network error, non-2xx, timeout).
 */
export async function fetchHtml(
  url: string,
  timeoutMs = 7000,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generic, best-effort extractor for schema.org Product data embedded as
 * JSON-LD (`<script type="application/ld+json">`). Many commerce sites expose
 * product data this way, which is far more stable than CSS selectors. Returns
 * partial product records; callers fill in retailer-specific fields.
 */
export function extractJsonLdProducts(
  html: string,
): Array<Partial<Product>> {
  const $ = cheerio.load(html);
  const out: Array<Partial<Product>> = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes = collectProductNodes(parsed);
    for (const node of nodes) {
      const offers = Array.isArray(node.offers)
        ? node.offers[0]
        : node.offers;
      const priceRaw = offers?.price ?? offers?.lowPrice;
      const price =
        priceRaw != null && !Number.isNaN(Number(priceRaw))
          ? Number(priceRaw)
          : null;
      const image = Array.isArray(node.image) ? node.image[0] : node.image;
      out.push({
        title: typeof node.name === "string" ? node.name : undefined,
        brand:
          typeof node.brand === "string"
            ? node.brand
            : node.brand?.name,
        price,
        currency: offers?.priceCurrency ?? "USD",
        image: typeof image === "string" ? image : undefined,
        inStock: offers?.availability
          ? /InStock/i.test(String(offers.availability))
          : true,
        url: typeof node.url === "string" ? node.url : undefined,
      });
    }
  });

  return out;
}

interface JsonLdProduct {
  "@type"?: string | string[];
  name?: string;
  url?: string;
  image?: string | string[];
  brand?: { name?: string } | string;
  offers?:
    | { price?: string | number; lowPrice?: string | number; priceCurrency?: string; availability?: string }
    | Array<{ price?: string | number; lowPrice?: string | number; priceCurrency?: string; availability?: string }>;
}

function collectProductNodes(parsed: unknown): JsonLdProduct[] {
  const result: JsonLdProduct[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown> & JsonLdProduct;
    const type = obj["@type"];
    const isProduct = Array.isArray(type)
      ? type.includes("Product")
      : type === "Product";
    if (isProduct && obj.name) result.push(obj);
    if (Array.isArray(obj["@graph"])) visit(obj["@graph"]);
  };
  visit(parsed);
  return result;
}
