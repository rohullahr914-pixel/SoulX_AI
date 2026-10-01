import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MySoulPublicChat } from "@/components/mysoul/public-chat";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { getMySoulMetadata } from "@/lib/server/mysoul";

type PageProps = { params: Promise<{ username: string }> };

async function profileFor(username: string) {
  const viewer = await getAuthenticatedUser();
  return getMySoulMetadata(username, viewer);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const profile = await profileFor(username);
    if (!profile) return { title: "MySoul | SoulX" };
    const title = `${profile.displayName}'s MySoul | SoulX`;
    const description = `Talk to ${profile.displayName}'s MySoul about the public interests, goals, and experiences they have chosen to share.`;
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://soulxai.tech";
    return {
      title,
      description,
      alternates: { canonical: `${base}/mysoul/${encodeURIComponent(profile.username)}` },
      openGraph: { title, description, type: "profile", url: `${base}/mysoul/${encodeURIComponent(profile.username)}`, images: [`${base}/mysoul/${encodeURIComponent(profile.username)}/opengraph-image`] },
      twitter: { card: "summary_large_image", title, description, images: [`${base}/mysoul/${encodeURIComponent(profile.username)}/opengraph-image`] },
    };
  } catch { return { title: "MySoul | SoulX" }; }
}

export default async function MySoulPage({ params }: PageProps) {
  const { username } = await params;
  const profile = await profileFor(username);
  if (!profile) notFound();
  return <MySoulPublicChat username={profile.username} />;
}
