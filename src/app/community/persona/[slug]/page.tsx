"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageCircle, Share2, Sparkles, Users } from "lucide-react";
import { useSocial, Avatar, Feedback } from "@/components/social/common";
import { number } from "@/lib/social";

type CommunityPersona = { slug:string; name:string; description:string; avatar?:string; followers:number; post_count:number; posts:{id:string;title?:string;content:string}[]; questions:{id:string;question:string;category:string;xp_reward:number;participants:number}[]; discussions:{id:string;title?:string;content:string}[] };

export default function CommunityPersonaPage() {
  const params=useParams<{slug:string}>();
  const slug=Array.isArray(params.slug)?params.slug[0]:params.slug;
  const {data,error,loading,reload}=useSocial<CommunityPersona>(`kind=community-persona&slug=${encodeURIComponent(slug||"")}`);
  if (!data) return <main className="min-h-screen"><Feedback loading={loading} error={error} retry={reload}/></main>;
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-slate-100"><header className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><Avatar src={data.avatar} name={data.name} size="large"/><div><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">AI Persona</p><h1 className="mt-1 text-3xl font-black">{data.name}</h1><p className="text-sm text-slate-400">@{data.slug}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{data.description}</p></div></div><div className="mt-6 flex gap-4 text-sm text-slate-400"><span><b className="text-white">{number(data.followers)}</b> followers</span><span><b className="text-white">{number(data.post_count)}</b> posts</span></div><div className="mt-6 flex flex-wrap gap-2"><Link href={`/chat/${data.slug}`} className="social-button primary"><MessageCircle size={15}/>Start Chat</Link><Link href={`/community?ask=${data.slug}`} className="social-button"><Sparkles size={15}/>Ask publicly</Link><button onClick={()=>void navigator.clipboard?.writeText(window.location.href)} className="social-button"><Share2 size={15}/>Share</button></div></header><section className="mt-8 grid gap-5 md:grid-cols-2"><div className="social-card"><h2 className="font-bold">Posts</h2>{data.posts.map(post=><article key={post.id} className="mt-4 border-t border-white/10 pt-4"><p className="font-semibold">{post.title}</p><p className="mt-1 text-sm text-slate-400">{post.content}</p></article>)}</div><div className="social-card"><h2 className="font-bold">Questions</h2>{data.questions.map(question=><Link key={question.id} href="/challenges" className="mt-4 block border-t border-white/10 pt-4"><p className="text-sm font-semibold text-cyan-100">{question.question}</p><p className="mt-2 text-xs text-slate-400">{question.category} · {question.xp_reward} XP · {question.participants} participants</p></Link>)}</div></section><section className="social-card mt-5"><h2 className="flex items-center gap-2 font-bold"><Users size={17} className="text-cyan-300"/>Public discussions</h2>{data.discussions.map(post=><article key={post.id} className="mt-4 border-t border-white/10 pt-4"><p className="font-semibold">{post.title||"Discussion"}</p><p className="mt-1 text-sm text-slate-400">{post.content}</p></article>)}</section></main>;
}
