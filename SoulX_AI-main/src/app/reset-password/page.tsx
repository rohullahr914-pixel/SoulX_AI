"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
export default function ResetPasswordPage() {
 const [password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");if(!supabase){setMessage("Supabase authentication is not configured.");setBusy(false);return;}const {error}=await supabase.auth.updateUser({password});setMessage(error?.message??"Password updated. You can now log in.");setBusy(false);}
 return <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12 text-white"><section className="w-full rounded-3xl border border-white/10 bg-slate-950/75 p-7"><p className="text-xs uppercase tracking-[.22em] text-cyan-300">Account security</p><h1 className="mt-3 text-3xl font-black">Choose a new password</h1><form onSubmit={submit} className="mt-7 space-y-4"><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="social-input" placeholder="New password"/><button disabled={busy} className="social-button primary w-full">{busy?"Updating…":"Update password"}</button></form>{message&&<p role="status" className="mt-4 text-sm text-cyan-200">{message}</p>}<Link href="/login" className="mt-5 block text-sm text-cyan-300">Back to login →</Link></section></main>;
}
