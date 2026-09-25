import { redirect } from "next/navigation";

export default function LeaderboardPage() {
	redirect("/community?tab=leaderboard");
}

/*
"use client";
import Link from 'next/link';
import {useState} from 'react';
import {Trophy,TrendingUp,ArrowUp,ArrowDown,Minus,Users,Heart} from 'lucide-react';
import {Avatar,Feedback,PersonaCard,SocialHero,useSocial} from '@/components/social/common';
import {number,type Ranking,type PersonaSocial} from '@/lib/social';

export default function LeaderboardPage(){
 const [tab,setTab]=useState('creator'),[period,setPeriod]=useState('week'),[page,setPage]=useState(0);
 const rising=tab==='rising';
 type Item = Ranking | PersonaSocial;
 const {data,error,loading,reload}=useSocial<{items:Item[]}>(rising?`kind=trending&page=${page}`:`kind=leaderboard&type=${tab}&period=${period}&page=${page}`);
 const href=(r:Ranking)=>tab==='creator'?`/creators/${r.username||r.entity_id}`:`/persona/${r.entity_id}`;
 return <main className="social-page"><SocialHero eyebrow="The SoulX community" title="Great minds rise together." description="Create something worth talking to. Build an audience. Make your mark."><div className="social-hero-emblem"><Trophy size={62} strokeWidth={1}/><span>THE LEADERBOARD</span></div></SocialHero>
 <div className="social-toolbar"><div className="social-tabs" role="tablist" aria-label="Ranking category">{[['creator','Top Creators'],['persona','Top Personas'],['rising','Rising Personas']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>{setTab(id);setPage(0);}}>{label}</button>)}</div>{!rising&&<div className="social-tabs compact" aria-label="Ranking period">{[['week','Weekly'],['all','All-Time']].map(([id,label])=><button key={id} aria-pressed={period===id} onClick={()=>{setPeriod(id);setPage(0);}}>{label}</button>)}</div>}</div>
 <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/>{rising?'Momentum from the last 7 days':period==='week'?'A new chapter every Monday · 00:00 UTC':'Every contribution. Every week. All time.'}</span><span>Updated every 5 minutes</span></div>
 <Feedback loading={loading} error={error} retry={reload}/>
 {!loading&&!error&&data&&<>{!data.items.length?<div className="social-empty"><Trophy size={32}/><h2>No rankings yet</h2><p>Start a conversation, publish a Persona, or complete a challenge to join the leaderboard.</p><Link href="/explore" className="social-button primary">Explore Personas →</Link></div>:rising?<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.items.map(p=><PersonaCard key={(p as PersonaSocial).slug} p={p as PersonaSocial}/>)}</div>:<>
 {page===0&&<div className="social-podium">{data.items.slice(0,3).map((item,i)=>{const r=item as Ranking;return <Link href={href(r)} key={r.entity_id} className={`social-podium-card place-${i+1}`}><span className="social-placement"><Trophy size={15}/> {['GOLD','SILVER','BRONZE'][i]}</span><Avatar src={r.avatar} name={r.name} size="large"/><h2>{r.name}</h2><p>{r.username?`@${r.username}`:'AI Persona'}</p><strong>{number(r.score)} <small>score</small></strong><div className="flex justify-center gap-5 text-xs text-slate-400"><span className="flex gap-1"><Heart size={13}/>{number(r.likes)}</span><span className="flex gap-1"><Users size={13}/>{number(r.users)}</span></div><span className="social-podium-rank">0{r.rank}</span></Link>;})}</div>}
 <div className="social-table-wrap"><table className="social-table"><thead><tr><th>Rank</th><th>{tab==='creator'?'Creator':'Persona'}</th><th>Score</th><th>Likes</th><th>Users</th><th>Movement</th></tr></thead><tbody>{data.items.map(item=>{const r=item as Ranking;const move=r.previous_rank?r.previous_rank-r.rank:0;return <tr key={r.entity_id}><td className={r.rank<=3?'text-amber-200':''}>#{r.rank}</td><td><Link href={href(r)} className="flex items-center gap-3"><Avatar src={r.avatar} name={r.name}/><div className="font-semibold">{r.name}{r.username&&<p className="mt-1 text-xs font-normal text-slate-500">@{r.username}</p>}</div></Link></td><td className="font-semibold text-cyan-200">{number(r.score)}</td><td>{number(r.likes)}</td><td>{number(r.users)}</td><td><span className={`inline-flex items-center gap-1 ${move>0?'text-emerald-300':move<0?'text-rose-300':'text-slate-500'}`}>{move>0?<ArrowUp size={14}/>:move<0?<ArrowDown size={14}/>:<Minus size={14}/>} {move?Math.abs(move):r.previous_rank?'':'New'}</span></td></tr>;})}</tbody></table></div></>}
 <div className="social-pagination"><button className="social-button" disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button className="social-button" disabled={data.items.length<24} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}
 <aside className="social-card mt-8 flex items-start gap-4"><TrendingUp className="shrink-0 text-cyan-300"/><div><h2 className="font-semibold">Built on impact</h2><p className="mt-2 text-sm leading-6 text-slate-400">Rankings reward unique users (5×), likes (3×), returning users (4×), conversations (0.5×, capped), followers (4×), and challenge participation (6×). Rising Personas reflects recent activity and growth. Your all-time progress stays with you.</p></div></aside>
 </main>;
}
*/
