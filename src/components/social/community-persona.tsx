"use client";
import Link from 'next/link';
import {Avatar,Feedback,useSocial} from './common';
import {PersonaSocialPanel} from './controls';
import type {PersonaSocial} from '@/lib/social';

export function CommunityPersona({slug}:{slug:string}) {const {data:p,error,loading,reload}=useSocial<PersonaSocial>(`kind=persona&slug=${encodeURIComponent(slug)}`);return <main className="social-page"><Feedback loading={loading} error={error} retry={reload}/>{p&&<><section className="social-hero"><div><p className="social-eyebrow">Community Persona</p><div className="mt-6 flex items-center gap-4"><Avatar src={p.avatar} name={p.name} size="large"/><h1>{p.name}</h1></div><p className="social-description">{p.description}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={`/chat/${p.slug}`} className="social-button primary">Start Chat →</Link><button className="social-button" onClick={async()=>{try{await navigator.clipboard.writeText(window.location.href);}catch{/* Native clipboard can be unavailable. */}}}>Copy profile link</button></div></div></section><PersonaSocialPanel slug={slug}/></>}</main>;}
