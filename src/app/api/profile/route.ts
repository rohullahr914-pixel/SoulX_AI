import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";

type ProfileRow = { display_name: string | null; username: string | null; bio: string | null; avatar_data_url: string | null; cover_url: string | null; website_url: string | null; social_links: Record<string, string> | null; profile_visibility: "Public" | "Private"; quote: string | null; quote_visibility: "Public" | "Private"; created_at: Date };
type FavoriteRow = { persona_slug: string };
type MessageRow = { id: string; persona_name: string; persona_slug: string | null; content: string; saved_at: Date };
type StatsRow = { created_personas: number; followers: number; following: number; community_posts: number; xp: number };
type BadgeRow = { id: string; name: string; description: string; earned_at: Date };
type ActivityRow = { id: string; kind: "post" | "reply"; title: string | null; content: string; post_id: string; created_at: Date };

export async function GET() {
  try {
    const user = await requireUser();
    const [profile, favorites, messages, stats, badges, activity] = await Promise.all([
      query<ProfileRow>("SELECT display_name, username, bio, avatar_data_url, cover_url, website_url, social_links, profile_visibility, quote, quote_visibility, created_at FROM profiles WHERE user_id = $1", [user.id]),
      query<FavoriteRow>("SELECT persona_slug FROM favorite_personas WHERE user_id = $1 ORDER BY created_at", [user.id]),
      query<MessageRow>("SELECT id, persona_name, persona_slug, content, saved_at FROM liked_messages WHERE user_id = $1 ORDER BY saved_at DESC", [user.id]),
      query<StatsRow>(`SELECT
        (SELECT count(*)::int FROM personas WHERE creator_id=$1) created_personas,
        (SELECT count(*)::int FROM community_follows WHERE following_user_id=$1) followers,
        (SELECT count(*)::int FROM community_follows WHERE follower_id=$1) following,
        (SELECT count(*)::int FROM community_posts WHERE user_id=$1 AND status='published') community_posts,
        (SELECT COALESCE(sum(amount),0)::int FROM xp_transactions WHERE user_id=$1) xp`, [user.id]),
      query<BadgeRow>("SELECT b.id,b.name,b.description,ub.earned_at FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id=$1 ORDER BY ub.earned_at DESC", [user.id]),
      query<ActivityRow>(`SELECT * FROM (
        SELECT p.id::text id, 'post'::text kind, p.title, p.content, p.id::text post_id, p.created_at
        FROM community_posts p WHERE p.user_id=$1 AND p.status='published'
        UNION ALL
        SELECT c.id::text id, 'reply'::text kind, p.title, c.content, p.id::text post_id, c.created_at
        FROM community_comments c JOIN community_posts p ON p.id=c.post_id
        WHERE c.user_id=$1 AND p.status='published'
      ) owned_activity ORDER BY created_at DESC LIMIT 12`, [user.id]),
    ]);
    const row = profile.rows[0];
    const metric = stats.rows[0] ?? { created_personas: 0, followers: 0, following: 0, community_posts: 0, xp: 0 };
    return NextResponse.json({ profile: { displayName: row?.display_name ?? user.name, username: row?.username ?? undefined, bio: row?.bio ?? "", avatarDataUrl: row?.avatar_data_url ?? undefined, coverUrl: row?.cover_url ?? undefined, websiteUrl: row?.website_url ?? undefined, socialLinks: row?.social_links ?? {}, joinedAt: row?.created_at ? new Date(row.created_at).toISOString() : user.createdAt, profileVisibility: row?.profile_visibility ?? "Public", quote: row?.quote ?? undefined, quoteVisibility: row?.quote_visibility ?? "Public", favoritePersonaSlugs: favorites.rows.map((item) => item.persona_slug), likedMessages: messages.rows.map((item) => ({ id: item.id, personaName: item.persona_name, personaSlug: item.persona_slug ?? undefined, content: item.content, savedAt: new Date(item.saved_at).toISOString() })), communityActivity: activity.rows.map((item) => ({ id: item.id, kind: item.kind, title: item.title ?? undefined, content: item.content, postId: item.post_id, createdAt: new Date(item.created_at).toISOString() })), stats: { createdPersonas: metric.created_personas, followers: metric.followers, following: metric.following, communityPosts: metric.community_posts, xp: metric.xp, badges: badges.rows.length }, badges: badges.rows.map((badge) => ({ id: badge.id, name: badge.name, description: badge.description, earnedAt: new Date(badge.earned_at).toISOString() })) } });
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
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : null;
    const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 500) : null;
    const cleanHttpsUrl = (value: unknown, max: number) => { if (value === "") return null; if (typeof value !== "string" || value.length > max) return undefined; try { const parsed = new URL(value); return parsed.protocol === "https:" ? parsed.toString() : undefined; } catch { return undefined; } };
    const websiteUrl = cleanHttpsUrl(body.websiteUrl, 500);
    const coverUrl = cleanHttpsUrl(body.coverUrl, 1000);
    const socialLinks = body.socialLinks && typeof body.socialLinks === "object" ? Object.fromEntries(Object.entries(body.socialLinks as Record<string, unknown>).filter(([key, value]) => ["x", "instagram", "linkedin", "github"].includes(key) && cleanHttpsUrl(value, 500)).map(([key, value]) => [key, cleanHttpsUrl(value, 500)])) : undefined;
    if (username !== null && !/^[a-z][a-z0-9_-]{2,39}$/.test(username)) return NextResponse.json({ error: "Username must be 3–40 characters and start with a letter." }, { status: 400 });
    const visibility = body.profileVisibility === "Private" ? "Private" : body.profileVisibility === "Public" ? "Public" : null;
    const avatar = typeof body.avatarDataUrl === "string" && body.avatarDataUrl.startsWith("data:image/") && body.avatarDataUrl.length <= 2_000_000 ? body.avatarDataUrl : body.avatarDataUrl === null ? null : undefined;
    await query(`INSERT INTO profiles (id, email, full_name, display_name, bio, avatar_data_url, profile_visibility) VALUES ($1, $7, COALESCE($2, ''), $2, $3, $4, COALESCE($5, 'Public'))
      ON CONFLICT (id) DO UPDATE SET display_name = COALESCE($2, profiles.display_name), full_name = COALESCE($2, profiles.full_name), bio = COALESCE($3, profiles.bio), avatar_data_url = CASE WHEN $6 THEN $4 ELSE profiles.avatar_data_url END, profile_visibility = COALESCE($5, profiles.profile_visibility), updated_at = now()`,
      [user.id, displayName, bio, avatar ?? null, visibility, avatar !== undefined, user.email]);
    await query(`UPDATE profiles SET username=COALESCE($2,username), website_url=CASE WHEN $3 THEN $4 ELSE website_url END, cover_url=CASE WHEN $5 THEN $6 ELSE cover_url END, social_links=CASE WHEN $7 THEN $8::jsonb ELSE social_links END, updated_at=now() WHERE id=$1`, [user.id, username, websiteUrl !== undefined, websiteUrl ?? null, coverUrl !== undefined, coverUrl ?? null, socialLinks !== undefined, socialLinks ? JSON.stringify(socialLinks) : null]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
