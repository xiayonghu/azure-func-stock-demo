import { NextRequest, NextResponse } from "next/server";
import { getSymbols } from "@/lib/symbols";

// The serverless Azure SQL database can take up to a minute to resume.
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!getSymbols().includes(symbol)) {
    return NextResponse.json({ error: "Unknown or missing symbol." }, { status: 400 });
  }

  const baseUrl = process.env.AZURE_FUNCTION_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "AZURE_FUNCTION_URL is not configured." }, { status: 500 });
  }

  const url = new URL(baseUrl);
  url.searchParams.set("Symbol", symbol);
  for (const key of ["from", "to"]) {
    const value = req.nextUrl.searchParams.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.AZURE_FUNCTION_KEY) headers["x-functions-key"] = process.env.AZURE_FUNCTION_KEY;

  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(85_000) });
    const body = await res.json().catch(() => ({ error: `Azure Function returned ${res.status}.` }));
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error("Azure Function call failed", err);
    return NextResponse.json({ error: "Could not reach the stock service." }, { status: 502 });
  }
}
