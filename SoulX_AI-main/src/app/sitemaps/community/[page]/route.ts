import { publicCommunityBatch } from "@/lib/server/public-personas";
import { urlset } from "@/lib/seo-sitemap";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!/^(0|[1-9][0-9]{0,6})$/.test(page)) return new Response("Not found", { status: 404 });
  try {
    const personas = await publicCommunityBatch(Number(page));
    return urlset(personas.map(p => ({ path: `/persona/${p.slug}`, updatedAt: p.updatedAt })));
  } catch {
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
  }
}
