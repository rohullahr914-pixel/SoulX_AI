import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { resolvePublicSoul } from "@/lib/server/mysoul";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    const viewer = await getAuthenticatedUser();
    const soul = await resolvePublicSoul(username, viewer);
    if (!soul) return NextResponse.json({ error: "This MySoul profile is unavailable." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const categories = soul.facts.map((fact) => `${fact.category} ${fact.source}`.toLowerCase());
    const questions: string[] = [];
    if (categories.some((value) => value.includes("interest"))) questions.push("What do I enjoy doing?");
    if (categories.some((value) => /technology|programming|\bai\b/.test(value))) questions.push("What technologies interest me?");
    if (categories.some((value) => value.includes("goal"))) questions.push("What goals am I working toward?");
    if (categories.some((value) => value.includes("memory"))) questions.push("What experiences have I shared?");
    if (categories.some((value) => /occupation|career|work/.test(value))) questions.push("What do I work on?");
    return NextResponse.json({
      ok: true,
      profile: {
        username: soul.username,
        displayName: soul.displayName,
        avatarUrl: soul.avatarUrl,
        headline: soul.headline,
        about: soul.about,
        canChat: soul.canChat,
        isOwner: soul.isOwner,
        historyDisclosure: soul.historyDisclosure,
        showOnProfile: Boolean(soul.showOnProfile),
        questions,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Public MySoul profile read failed");
    return NextResponse.json({ error: "Could not load this MySoul profile." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
