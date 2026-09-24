import { SITE_URL } from "@/lib/seo";
const escape = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
export function sitemapResponse(body: string) {
  return new Response('<?xml version="1.0" encoding="UTF-8"?>' + body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, must-revalidate" } });
}
export function urlset(entries: { path: string; updatedAt?: string }[]) {
  return sitemapResponse('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries.map(e => {
    const modified = e.updatedAt && Number.isFinite(Date.parse(e.updatedAt)) ? `<lastmod>${new Date(e.updatedAt).toISOString()}</lastmod>` : "";
    return `<url><loc>${escape(new URL(e.path, SITE_URL).href)}</loc>${modified}</url>`;
  }).join("") + "</urlset>");
}
