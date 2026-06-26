import type { Product } from "@/lib/types";

const RETAILER_COLORS: Record<string, string> = {
  ssense: "#111111",
  offwhite: "#111111",
  "off-white": "#111111",
  farfetch: "#1f1f1f",
  saks: "#7a2230",
  "saks-fifth-avenue": "#7a2230",
  nordstrom: "#1a1a1a",
  google: "#4285f4",
  "google-shopping": "#4285f4",
};

/** Stable fallback color derived from the merchant key. */
function colorFor(key: string): string {
  if (RETAILER_COLORS[key]) return RETAILER_COLORS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 45% 28%)`;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "See price";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price}`;
  }
}

export default function ProductCard({ product }: { product: Product }) {
  const chipColor = colorFor(product.retailerKey);
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={`${product.brand} ${product.title}`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: chipColor }}
        >
          {product.retailer}
        </span>
        {!product.inStock && (
          <span className="absolute right-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        )}
        {product.source === "sample" && (
          <span className="absolute bottom-2 left-2 rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
            Sample
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.brand}</p>
            <p className="truncate text-xs text-neutral-500">{product.title}</p>
          </div>
          <p className="shrink-0 text-sm font-bold">
            {formatPrice(product.price, product.currency)}
          </p>
        </div>

        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.sizes.map((s) => (
              <span
                key={s}
                className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {(product.rating != null || product.delivery) && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            {product.rating != null && (
              <span className="text-amber-500">
                ★ {product.rating}
                {product.reviews != null && (
                  <span className="text-neutral-400"> ({product.reviews})</span>
                )}
              </span>
            )}
            {product.delivery && <span className="truncate">{product.delivery}</span>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className={`text-[11px] font-medium ${
              product.inStock ? "text-emerald-600" : "text-neutral-400"
            }`}
          >
            {product.inStock ? "In stock" : "Out of stock"}
          </span>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-700"
          >
            Go to site →
          </a>
        </div>
      </div>
    </div>
  );
}
