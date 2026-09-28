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
  const [access, setAccess] = useState<Access>("checking");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/voice/session", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { allowed?: boolean; unavailable?: boolean };
        if (!cancelled) {
          setAccess(response.status === 401 ? "signed-out" : data.allowed ? "allowed" : data.unavailable ? "unavailable" : "locked");
        }
      })
      .catch(() => {
        if (!cancelled) setAccess("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const end = useCallback(async () => {
    const active = conversationRef.current;
    conversationRef.current = null;
    await active?.endSession().catch(() => undefined);
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sessionId) {
      void fetch("/api/voice/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    }
    setState("idle");
    setMode("listening");
  }, []);

  const start = useCallback(async () => {
    if (access === "signed-out") {
      router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (access === "locked") {
      router.push("/pricing");
      return;
    }
    if (access !== "allowed" || state !== "idle") return;

    setState("connecting");
    setError("");
    setMode("listening");

    try {
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaSlug, conversationId }),
      });
      const data = (await response.json()) as Partial<VoiceSession> & { error?: string };

      if (!response.ok || !data.signedUrl || !data.sessionId || !data.overrides) {
        throw new Error(data.error ?? "Voice could not be started.");
      }

      sessionIdRef.current = data.sessionId;
      const active = await Conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: data.overrides,
        connectionType: "websocket",
        onConnect: () => setState("connected"),
        onModeChange: ({ mode: nextMode }) => setMode(nextMode),
        onError: (message) => {
          setError(message || "Voice conversation failed.");
          setState("error");
        },
        onDisconnect: () => {
          conversationRef.current = null;
          const endedSessionId = sessionIdRef.current;
          sessionIdRef.current = null;
          if (endedSessionId) {
            void fetch("/api/voice/session/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: endedSessionId }),
            });
          }
          setState("idle");
          setMode("listening");
        },
      });

      conversationRef.current = active;
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Voice could not be started.");
    }
  }, [access, conversationId, personaSlug, router, state]);

  useEffect(() => () => {
    void end();
  }, [end]);

  const busy = state === "connecting";
  const isConnected = state === "connected";
  const isLocked = access === "locked";
  const statusLabel = isConnected ? (mode === "speaking" ? "Persona is speaking" : "Listening live") : busy ? `Connecting to ${personaSlug}` : isLocked ? "Voice · Pro" : "Start voice conversation";
  const buttonTone = isConnected
    ? "border-red-300/60 bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.35)]"
    : isLocked
      ? "border-violet-300/40 bg-violet-500/12 text-violet-100"
      : "border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)] hover:brightness-110";
  const statusText = error
    ? error
    : busy
      ? `Connecting to ${personaSlug}...`
      : isConnected
        ? mode === "speaking"
          ? "The persona is speaking now."
          : "Listening for your voice..."
        : isLocked
          ? "Voice conversations are included with Pro."
          : "Tap to start a live voice chat";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3" dir="auto">
      <button
        type="button"
        aria-label={statusLabel}
        title={statusLabel}
        onClick={() => void (isConnected ? end() : start())}
        disabled={access === "checking" || busy}
        className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone} ${isConnected ? "scale-[1.02]" : ""}`}
      >
        {busy ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : isLocked ? (
          <LockKeyhole className="h-5 w-5" />
        ) : isConnected ? (
          <PhoneOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}

        {isConnected && (
          <span className="absolute inset-0 rounded-full border border-cyan-200/60 animate-ping" aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <Volume2 className={`h-3.5 w-3.5 ${isConnected ? "text-cyan-300" : "text-slate-400"}`} />
            Live voice
          </span>
          {isConnected && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-200">
              {mode === "speaking" ? "Speaking" : "Listening"}
            </span>
          )}
        </div>

        <p aria-live="polite" className={`mt-1 truncate text-sm ${error ? "text-red-200" : "text-slate-100"}`}>
          {statusText}
        </p>
      </div>
    </div>
  );
}
