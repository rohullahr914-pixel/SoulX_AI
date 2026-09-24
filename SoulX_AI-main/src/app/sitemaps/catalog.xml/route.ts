import { publicPages } from "@/lib/seo";
import { catalogPersonas } from "@/lib/server/public-personas";
import { urlset } from "@/lib/seo-sitemap";
export const dynamic = "force-static";
export function GET() {
  return urlset([...Object.keys(publicPages).map(path => ({ path })), ...catalogPersonas.map(p => ({ path: `/persona/${p.slug}` }))]);
}
