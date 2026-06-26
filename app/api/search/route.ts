import { NextResponse } from "next/server";
import { aggregateSearch } from "@/lib/providers";
import type { Gender } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const genderParam = (searchParams.get("gender") ?? "all").toLowerCase();
  const gender: Gender =
    genderParam === "men" || genderParam === "women" ? genderParam : "all";

  if (!query) {
    return NextResponse.json(
      { error: "Missing required query parameter `q`." },
      { status: 400 },
    );
  }

  try {
    const result = await aggregateSearch(query, gender);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Search failed.", detail: String(err) },
      { status: 500 },
    );
  }
}
