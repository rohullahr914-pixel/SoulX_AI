import { SITE_URL } from "@/lib/seo";
import { sitemapResponse } from "@/lib/seo-sitemap";
import { countPublicCommunityPersonas, SITEMAP_BATCH_SIZE } from "@/lib/server/public-personas";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const count = await countPublicCommunityPersonas();
    const paths = ["/sitemaps/catalog.xml", ...Array.from({ length: Math.ceil(count / SITEMAP_BATCH_SIZE) }, (_, i) => `/sitemaps/community/${i}`)];
    return sitemapResponse('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + paths.map(p => `<sitemap><loc>${SITE_URL}${p}</loc></sitemap>`).join("") + "</sitemapindex>");
  } catch {
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
  }
}
