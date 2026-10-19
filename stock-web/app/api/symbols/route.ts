import { callAzureFunction } from "@/lib/azure";

// The serverless Azure SQL database can take up to a minute to resume.
export const maxDuration = 90;
export const dynamic = "force-dynamic";

export async function GET() {
  return callAzureFunction("symbols");
}
