import { NextResponse } from "next/server";

// AZURE_FUNCTION_URL points at .../api/stockhistory; sibling endpoints share its base path.
function endpoint(name: string): URL | null {
  const configured = process.env.AZURE_FUNCTION_URL;
  if (!configured) return null;
  const url = new URL(configured);
  url.pathname = url.pathname.replace(/\/[^/]*\/?$/, `/${name}`);
  return url;
}

export async function callAzureFunction(name: string, params: Record<string, string> = {}) {
  const url = endpoint(name);
  if (!url) {
    return NextResponse.json({ error: "AZURE_FUNCTION_URL is not configured." }, { status: 500 });
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.AZURE_FUNCTION_KEY) headers["x-functions-key"] = process.env.AZURE_FUNCTION_KEY;

  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(85_000) });
    const body = await res.json().catch(() => ({ error: `Azure Function returned ${res.status}.` }));
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    console.error(`Azure Function '${name}' call failed`, err);
    return NextResponse.json({ error: "Could not reach the stock service." }, { status: 502 });
  }
}
