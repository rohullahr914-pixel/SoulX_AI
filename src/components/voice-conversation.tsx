"use client";

import { Conversation } from "@elevenlabs/react";
import { LoaderCircle, LockKeyhole, Mic, PhoneOff, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Access = "checking" | "allowed" | "locked" | "signed-out" | "unavailable";
type State = "idle" | "connecting" | "connected" | "error";
type VoiceSession = { sessionId: string; signedUrl: string; overrides: Parameters<typeof Conversation.startSession>[0]["overrides"] };

// This component intentionally has no transcript callback: a voice turn never
// reaches /api/chat. ElevenLabs handles microphone input and spoken output.
export function VoiceConversation({ personaSlug, conversationId }: { personaSlug: string; conversationId: string }) {
  const router = useRouter();
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [access, setAccess] = useState<Access>("checking"); const [state, setState] = useState<State>("idle"); const [error, setError] = useState(""); const [mode, setMode] = useState<"speaking" | "listening">("listening");
  useEffect(() => { let cancelled = false; void fetch("/api/voice/session", { cache: "no-store" }).then(async response => { const data = await response.json() as { allowed?: boolean; unavailable?: boolean }; if (!cancelled) setAccess(response.status === 401 ? "signed-out" : data.allowed ? "allowed" : data.unavailable ? "unavailable" : "locked"); }).catch(() => { if (!cancelled) setAccess("unavailable"); }); return () => { cancelled = true; }; }, []);
  const end = useCallback(async () => { const active = conversationRef.current; conversationRef.current = null; await active?.endSession().catch(() => undefined); const sessionId = sessionIdRef.current; sessionIdRef.current = null; if (sessionId) void fetch("/api/voice/session/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }); setState("idle"); }, []);
  const start = useCallback(async () => {
    if (access === "signed-out") { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    if (access === "locked") { router.push("/pricing"); return; }
    if (access !== "allowed" || state !== "idle") return;
    setState("connecting"); setError("");
    try {
      const response = await fetch("/api/voice/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaSlug, conversationId }) });
      const data = await response.json() as Partial<VoiceSession> & { error?: string };
      if (!response.ok || !data.signedUrl || !data.sessionId || !data.overrides) throw new Error(data.error ?? "Voice could not be started.");
      sessionIdRef.current = data.sessionId;
      const active = await Conversation.startSession({ signedUrl: data.signedUrl, overrides: data.overrides, connectionType: "websocket", onConnect: () => setState("connected"), onModeChange: ({ mode: nextMode }) => setMode(nextMode), onError: (message) => { setError(message || "Voice conversation failed."); setState("error"); }, onDisconnect: () => { conversationRef.current = null; const endedSessionId = sessionIdRef.current; sessionIdRef.current = null; if (endedSessionId) void fetch("/api/voice/session/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: endedSessionId }) }); setState("idle"); } });
      conversationRef.current = active;
    } catch (caught) { setState("error"); setError(caught instanceof Error ? caught.message : "Voice could not be started."); }
  }, [access, conversationId, personaSlug, router, state]);
  useEffect(() => () => { void end(); }, [end]);
  const busy = state === "connecting";
  const label = state === "connected" ? "End voice conversation" : access === "locked" ? "Voice · Pro" : "Start voice conversation";
  return <div className="flex min-w-0 flex-col gap-2" dir="auto"><div className="flex items-center gap-2"><button type="button" aria-label={label} title={label} onClick={() => void (state === "connected" ? end() : start())} disabled={access === "checking" || busy} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-55 ${state === "connected" ? "border-red-300/60 bg-red-500/80 text-white" : "border-violet-300/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"}`}>{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : access === "locked" ? <LockKeyhole className="h-5 w-5" /> : state === "connected" ? <PhoneOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>{busy && <span className="text-xs text-slate-300">Connecting to {personaSlug}…</span>}{state === "connected" && <span className="inline-flex items-center gap-1 text-xs text-cyan-200"><Volume2 className="h-3.5 w-3.5" />{mode === "speaking" ? "Persona is speaking…" : "Listening…"}</span>}{access === "locked" && <span className="text-xs text-violet-200">Voice conversations are included with Pro.</span>}</div>{error && <p role="alert" className="text-xs text-red-200">{error}</p>}</div>;
}
