"use client";

import { useCallback, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { Gender, SearchResponse } from "@/lib/types";

const GENDERS: Array<{ key: Gender; label: string }> = [
  { key: "all", label: "All" },
  { key: "men", label: "Men" },
  { key: "women", label: "Women" },
];

const EXAMPLES = [
  "OFF-WHITE Mens shirt",
  "Nike sneakers",
  "Stone Island jacket",
  "Amiri jeans",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<Gender>("men");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [activeRetailers, setActiveRetailers] = useState<Set<string>>(
    new Set(),
  );

  const runSearch = useCallback(
    async (q: string, g: Gender) => {
      const term = q.trim();
      if (!term) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}&gender=${g}`,
        );
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as SearchResponse;
        setData(json);
        setActiveRetailers(new Set());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query, gender);
  };

  const toggleRetailer = (key: string) => {
    setActiveRetailers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleProducts = useMemo(() => {
    if (!data) return [];
    if (activeRetailers.size === 0) return data.products;
    return data.products.filter((p) => activeRetailers.has(p.retailerKey));
  }, [data, activeRetailers]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-neutral-200 bg-[#f6f6f4]/90 px-4 py-4 backdrop-blur">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">
            S<span className="text-[#4285f4]">Hub</span>
          </h1>
          <p className="text-sm text-neutral-500">
            One catalog. Every store. Search SSENSE, Off-White, Farfetch, Saks,
            Nordstrom &amp; Google Shopping at once.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. OFF-WHITE Mens shirt"
            className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
            aria-label="Search products"
          />
          <div className="flex overflow-hidden rounded-lg border border-neutral-300 bg-white">
            {GENDERS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGender(g.key)}
                className={`px-3 py-2 text-sm font-medium transition ${
                  gender === g.key
                    ? "bg-black text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {!data && !loading && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex, gender);
                }}
                className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 transition hover:border-black"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
              data.mode === "live"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                data.mode === "live" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="font-semibold">
              {data.mode === "live" ? "Live data" : "Sample data"}
            </span>
            {data.note && <span className="text-xs opacity-80">— {data.note}</span>}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-500">
              {visibleProducts.length} results for{" "}
              <span className="font-semibold text-neutral-800">
                “{data.query}”
              </span>
            </span>
            <span className="mx-1 text-neutral-300">|</span>
            {data.retailers.map((r) => {
              const active =
                activeRetailers.size === 0 || activeRetailers.has(r.key);
              return (
                <button
                  key={r.key}
                  onClick={() => toggleRetailer(r.key)}
                  title={`${r.count} from ${r.name}`}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 bg-white text-neutral-600"
                  }`}
                >
                  {r.name} ({r.count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : visibleProducts.length === 0 ? (
            <p className="py-16 text-center text-neutral-500">
              No products match the selected stores.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleProducts.map((p) => (
                <ProductCard key={`${p.retailerKey}-${p.id}`} product={p} />
              ))}
            </div>
          )}
        </>
      )}

      {!data && loading && <SkeletonGrid />}

      {!data && !loading && (
        <div className="py-24 text-center text-neutral-400">
          <p className="text-lg">Search once. Shop everywhere.</p>
        </div>
      )}
    </main>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
        >
          <div className="aspect-[4/5] animate-pulse bg-neutral-200" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
