import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicPersona, catalogPersonas } from "@/lib/server/public-personas";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const p = await getPublicPersona((await params).slug);
  if (!p) notFound();
  return pageMetadata(`/persona/${p.slug}`, `${p.name} AI Persona`, p.introduction, p.indexable);
}
export default async function PersonaPage({ params }: Props) {
  const p = await getPublicPersona((await params).slug);
  if (!p) notFound();
  const related = catalogPersonas.filter(other => other.slug !== p.slug && other.category === p.category).slice(0, 4);
  const url = `${SITE_URL}/persona/${p.slug}`;
  return <main className="mx-auto max-w-5xl px-4 py-10 text-white">
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [
      { "@type": "WebPage", "@id": url, url, name: `${p.name} AI Persona`, description: p.introduction, isPartOf: { "@id": `${SITE_URL}/#website` }, breadcrumb: { "@id": `${url}#breadcrumbs` } },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumbs`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Explore", item: `${SITE_URL}/explore` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ] },
    ] }} />
    <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-3 text-sm text-cyan-200"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/explore">Explore</Link><span aria-hidden="true">/</span><span aria-current="page">{p.name}</span></nav>
    <article className="rounded-[28px] border border-white/10 bg-slate-950/75 p-6 sm:p-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Image src={p.avatar} alt={`Portrait representing the ${p.name} AI persona`} width={160} height={160} sizes="160px" className="h-40 w-40 rounded-3xl object-cover" />
        <div><p className="text-sm text-cyan-300">{p.category} · AI persona</p><h1 className="mt-2 text-4xl font-bold tracking-tight">{p.name}</h1><p className="mt-3 text-slate-300">{p.profession}</p></div>
      </header>
      <p className="mt-8 text-lg leading-8 text-slate-200">{p.introduction}</p>
      {p.biography && p.biography !== p.introduction && <p className="mt-4 leading-7 text-slate-300">{p.biography}</p>}
      <p className="mt-4 text-sm leading-6 text-slate-400">{p.disclaimer}</p>
      <Link href={`/chat/${p.slug}`} className="mt-6 inline-flex rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950">Start chat with {p.name}</Link>
      {p.expertise.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold">Areas of knowledge</h2><ul className="mt-4 flex flex-wrap gap-3">{p.expertise.map(topic => <li key={topic} className="rounded-full border border-white/15 px-4 py-2 text-slate-200">{topic}</li>)}</ul></section>}
      {p.topics.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold">Questions to explore</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-slate-300">{p.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></section>}
    </article>
    {related.length > 0 && <section className="mt-10"><h2 className="text-2xl font-bold">Related {p.category.toLowerCase()} personas</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{related.map(other => <Link key={other.slug} href={`/persona/${other.slug}`} className="rounded-2xl border border-white/10 p-5 hover:border-cyan-300/50"><h3 className="font-bold text-cyan-200">{other.name}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{other.shortDescription}</p></Link>)}</div></section>}
    <nav aria-label="Continue exploring" className="mt-10 flex flex-wrap gap-6 text-cyan-200"><Link href="/explore">Explore all personas</Link><Link href="/room">Compare perspectives in a room</Link><Link href="/community">Join the community</Link><Link href="/about">About SoulX</Link></nav>
  </main>;
}
