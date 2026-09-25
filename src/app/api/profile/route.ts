import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";

type ProfileRow = { display_name: string | null; bio: string | null; avatar_data_url: string | null; profile_visibility: "Public" | "Private"; quote: string | null; quote_visibility: "Public" | "Private" };
type FavoriteRow = { persona_slug: string };
type MessageRow = { id: string; persona_name: string; persona_slug: string | null; content: string; saved_at: Date };

export async function GET() {
  try {
    const user = await requireUser();
    const [profile, favorites, messages] = await Promise.all([
      query<ProfileRow>("SELECT display_name, bio, avatar_data_url, profile_visibility, quote, quote_visibility FROM profiles WHERE user_id = $1", [user.id]),
      query<FavoriteRow>("SELECT persona_slug FROM favorite_personas WHERE user_id = $1 ORDER BY created_at", [user.id]),
      query<MessageRow>("SELECT id, persona_name, persona_slug, content, saved_at FROM liked_messages WHERE user_id = $1 ORDER BY saved_at DESC", [user.id]),
    ]);
    const row = profile.rows[0];
    return NextResponse.json({ profile: { displayName: row?.display_name ?? user.name, bio: row?.bio ?? "", avatarDataUrl: row?.avatar_data_url ?? undefined, profileVisibility: row?.profile_visibility ?? "Public", quote: row?.quote ?? undefined, quoteVisibility: row?.quote_visibility ?? "Public", favoritePersonaSlugs: favorites.rows.map((item) => item.persona_slug), likedMessages: messages.rows.map((item) => ({ id: item.id, personaName: item.persona_name, personaSlug: item.persona_slug ?? undefined, content: item.content, savedAt: new Date(item.saved_at).toISOString() })) } });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Profile read failed", error);
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 120) : null;
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 500) : null;
    const visibility = body.profileVisibility === "Private" ? "Private" : body.profileVisibility === "Public" ? "Public" : null;
    const avatar = typeof body.avatarDataUrl === "string" && body.avatarDataUrl.startsWith("data:image/") && body.avatarDataUrl.length <= 2_000_000 ? body.avatarDataUrl : body.avatarDataUrl === null ? null : undefined;
    await query(`INSERT INTO profiles (id, email, full_name, display_name, bio, avatar_data_url, profile_visibility) VALUES ($1, $7, COALESCE($2, ''), $2, $3, $4, COALESCE($5, 'Public'))
      ON CONFLICT (id) DO UPDATE SET display_name = COALESCE($2, profiles.display_name), full_name = COALESCE($2, profiles.full_name), bio = COALESCE($3, profiles.bio), avatar_data_url = CASE WHEN $6 THEN $4 ELSE profiles.avatar_data_url END, profile_visibility = COALESCE($5, profiles.profile_visibility), updated_at = now()`,
      [user.id, displayName, bio, avatar ?? null, visibility, avatar !== undefined, user.email]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
