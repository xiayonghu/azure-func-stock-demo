import { NextRequest, NextResponse } from "next/server";
import { callAzureFunction } from "@/lib/azure";

// The serverless Azure SQL database can take up to a minute to resume.
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid or missing symbol." }, { status: 400 });
  }

  const params: Record<string, string> = { Symbol: symbol };
  for (const key of ["from", "to"]) {
    const value = req.nextUrl.searchParams.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) params[key] = value;
  }

  return callAzureFunction("stockhistory", params);
}
