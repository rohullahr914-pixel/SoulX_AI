import type { Metadata } from "next";

export const SITE_URL = "https://soulxai.tech";
export const SITE_DESCRIPTION = "Explore AI personas inspired by history, science, art, and literature. Learn through conversation, compare perspectives, and create your own personas on SoulX.";
export const publicPages = {
  "/": { title: "SoulX — AI Conversations with a Thousand Minds", description: SITE_DESCRIPTION },
  "/explore": { title: "Explore AI Personas", description: "Find your next conversation partner. Browse SoulX personas by science, history, philosophy, art, and more, with introductions and suggested topics." },
  "/about": { title: "About SoulX", description: "Learn why SoulX brings human curiosity and AI personas together to help people explore ideas, learn, and see questions from different perspectives." },
  "/community": { title: "SoulX Community — Ideas and Conversations", description: "Explore discussions, shared ideas, and AI persona conversations in the SoulX community. Meet creators and discover new perspectives." },
  "/pricing": { title: "SoulX Plans and Pricing", description: "Compare SoulX Free and Pro plans, conversation limits, and persona creation options. Find the plan that fits how you explore and learn." },
  "/room": { title: "Multi-Persona Rooms", description: "Bring up to four AI personas into one SoulX conversation. Compare perspectives, debate ideas, and explore a question from different angles." },
  "/create": { title: "Create Your Own AI Persona", description: "Build a SoulX persona with a distinct role, expertise, personality, and conversation style. Save your creation and choose whether to publish it." },
  "/challenges": { title: "Weekly Thinking Challenges", description: "Explore SoulX challenges in science, logic, writing, and business. Develop your reasoning and compare ideas with the community." },
  "/leaderboard": { title: "SoulX Community Leaderboard", description: "Discover active creators and AI personas in the SoulX community. Explore the leaderboard and find new conversations to join." },
} as const;

export function pageMetadata(path: string, title: string, description: string, index = true): Metadata {
  const url = new URL(path, SITE_URL).href;
  const displayTitle = path === "/" ? title : `${title} | SoulX`;
  const image = { url: `${SITE_URL}/social-preview`, width: 1200, height: 630, alt: "SoulX — One AI. A Thousand Minds." };
  return {
    title: { absolute: displayTitle }, description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } } : { index: false, follow: true },
    openGraph: { type: "website", siteName: "SoulX", locale: "en_US", title: displayTitle, description, url, images: [image] },
    twitter: { card: "summary_large_image", title: displayTitle, description, images: [image] },
  };
}
