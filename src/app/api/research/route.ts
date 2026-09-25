import { NextResponse } from "next/server";
import { runResearchQuery } from "@/lib/research";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "A research question is required." }, { status: 400 });
    }

    const result = await runResearchQuery(query);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "Unable to process the research request." }, { status: 500 });
  }
}
