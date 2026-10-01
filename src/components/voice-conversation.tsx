"use client";

import { Conversation } from "@elevenlabs/react";
import { LoaderCircle, LockKeyhole, Mic, MicOff, PhoneOff, Timer, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Access = "checking" | "allowed" | "locked" | "signed-out" | "unavailable";
type State = "idle" | "connecting" | "connected" | "error";
type VoiceSession = {
  sessionId: string;
  signedUrl: string;
  reservedMinutes: number;
  overrides: Parameters<typeof Conversation.startSession>[0]["overrides"];
};
type Transcript = { id: string; role: "user" | "assistant"; content: string };

export function VoiceConversation({
  personaSlug,
  conversationId,
  onTranscript,
}: {
  personaSlug: string;
  conversationId: string;
  onTranscript?: (message: Transcript) => void;
}) {
  const router = useRouter();
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const deadlineRef = useRef(0);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const seenEventsRef = useRef(new Set<string>());
  const [access, setAccess] = useState<Access>("checking");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"speaking" | "listening">("listening");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const finishServerSession = useCallback((sessionId: string, action: "ended" | "failed" = "ended") => {
    const body = JSON.stringify({ sessionId, action });
    try {
      if (typeof navigator !== "undefined" && document.visibilityState === "hidden" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/voice/session/end", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/voice/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch {
      // The database also expires abandoned sessions; a local teardown must not throw.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    void fetch(`/api/voice/session?personaSlug=${encodeURIComponent(personaSlug)}`, { cache: "no-store" })
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
      mountedRef.current = false;
    };
  }, [personaSlug]);

  const end = useCallback(async () => {
    attemptRef.current += 1;
    const active = conversationRef.current;
    conversationRef.current = null;
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    deadlineRef.current = 0;
    if (active) await active.endSession().catch(() => undefined);
    if (sessionId) finishServerSession(sessionId);
    if (mountedRef.current) {
      setState("idle");
      setMode("listening");
      setMuted(false);
      setRemainingSeconds(0);
    }
  }, [finishServerSession]);

  const registerConnectedSession = useCallback((sessionId: string) => {
    void fetch("/api/voice/session/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "connected" }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error("Unable to register voice session.");
    }).catch(() => {
      if (mountedRef.current && sessionIdRef.current === sessionId) {
        setError("Voice connection could not be registered. Please try again.");
        void end();
      }
    });
  }, [end]);

  useEffect(() => () => {
    void end();
  }, [end]);

  useEffect(() => {
    if (state !== "connected" || !deadlineRef.current) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1_000));
      setRemainingSeconds(remaining);
      if (remaining === 0) void end();
    };
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [end, state]);

  const start = useCallback(async () => {
    if (access === "signed-out") {
      router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (access === "locked") {
      router.push("/pricing");
      return;
    }
    if (access !== "allowed" || (state !== "idle" && state !== "error")) return;

    const attempt = ++attemptRef.current;
    setState("connecting");
    setError("");
    setMode("listening");
    seenEventsRef.current.clear();

    let reservedSessionId: string | null = null;
    try {
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaSlug, conversationId }),
      });
      const data = (await response.json()) as Partial<VoiceSession> & { error?: string };
      if (!response.ok || !data.signedUrl || !data.sessionId || !data.overrides || !Number.isInteger(data.reservedMinutes) || !data.reservedMinutes) {
        throw new Error(data.error ?? "Voice could not be started.");
      }

      reservedSessionId = data.sessionId;
      sessionIdRef.current = data.sessionId;
      deadlineRef.current = Date.now() + data.reservedMinutes * 60_000;
      setRemainingSeconds(data.reservedMinutes * 60);

      const active = await Conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: data.overrides,
        connectionType: "websocket",
        onConnect: () => {
          if (!mountedRef.current || attempt !== attemptRef.current) return;
          setState("connected");
          setVolume(0.85);
          if (sessionIdRef.current) registerConnectedSession(sessionIdRef.current);
        },
        onModeChange: ({ mode: nextMode }) => {
          if (mountedRef.current) setMode(nextMode);
        },
        onMessage: ({ message, role, event_id }) => {
          const content = message.trim();
          const sessionId = sessionIdRef.current;
          if (!content || !sessionId || !Number.isInteger(event_id)) return;
          const id = `${sessionId}:${event_id}:${role}`;
          if (seenEventsRef.current.has(id)) return;
          seenEventsRef.current.add(id);
          onTranscript?.({ id, role: role === "agent" ? "assistant" : "user", content });
          void fetch("/api/voice/session/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, eventId: event_id, role: role === "agent" ? "assistant" : "user", content }),
            keepalive: true,
          }).catch(() => undefined);
        },
        onError: (message) => {
          if (!mountedRef.current) return;
          setError(message || "Voice conversation failed. You can try again.");
          if (!sessionIdRef.current) setState("error");
        },
        onDisconnect: () => {
          conversationRef.current = null;
          const endedSessionId = sessionIdRef.current;
          sessionIdRef.current = null;
          deadlineRef.current = 0;
          if (endedSessionId) finishServerSession(endedSessionId);
          if (mountedRef.current) {
            setState("idle");
            setMode("listening");
            setMuted(false);
            setRemainingSeconds(0);
          }
        },
      });

      if (!mountedRef.current || attempt !== attemptRef.current) {
        await active.endSession().catch(() => undefined);
        if (sessionIdRef.current === data.sessionId) {
          sessionIdRef.current = null;
          finishServerSession(data.sessionId, "failed");
        }
        return;
      }
      conversationRef.current = active;
    } catch (caught) {
      if (reservedSessionId && sessionIdRef.current === reservedSessionId) {
        sessionIdRef.current = null;
        finishServerSession(reservedSessionId, "failed");
      }
      if (mountedRef.current && attempt === attemptRef.current) {
        setState("error");
        setError(caught instanceof Error ? caught.message : "Voice could not be started. You can try again.");
      }
    }
  }, [access, conversationId, end, finishServerSession, onTranscript, personaSlug, registerConnectedSession, router, state]);

  const toggleMute = () => {
    const nextMuted = !muted;
    conversationRef.current?.setMicMuted(nextMuted);
    setMuted(nextMuted);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    void conversationRef.current?.setVolume({ volume: nextVolume });
  };

  const busy = state === "connecting";
  const isConnected = state === "connected";
  const isLocked = access === "locked";
  const isUnavailable = access === "unavailable";
  const statusLabel = isConnected ? "End voice conversation" : isLocked ? "Upgrade to Pro for voice" : access === "signed-out" ? "Sign in to use voice" : isUnavailable ? "Voice is not configured for this Persona" : state === "error" ? "Retry voice conversation" : busy ? `Connecting to ${personaSlug}` : "Start voice conversation";
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
        ? mode === "speaking" ? "The Persona is speaking." : "Listening for your voice..."
        : isLocked
          ? "Voice conversations are included with Pro."
          : access === "signed-out"
            ? "Sign in to start a Pro voice conversation."
            : isUnavailable
              ? "Live voice is not set up for this Persona yet. Please try again later."
              : "Tap to start a live voice conversation";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3" dir="auto">
      <button
        type="button"
        aria-label={statusLabel}
        title={statusLabel}
        onClick={() => void (isConnected ? end() : start())}
        disabled={access === "checking" || isUnavailable || busy}
        className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone} ${isConnected ? "scale-[1.02]" : ""}`}
      >
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : isLocked ? <LockKeyhole className="h-5 w-5" /> : isConnected ? <PhoneOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {isConnected && <span className="absolute inset-0 rounded-full border border-cyan-200/60 animate-ping" aria-hidden="true" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
          <span className="inline-flex items-center gap-1.5"><Volume2 className={`h-3.5 w-3.5 ${isConnected ? "text-cyan-300" : "text-slate-400"}`} />Live voice</span>
          {isConnected && <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-200">{mode === "speaking" ? "Speaking" : muted ? "Mic muted" : "Listening"}</span>}
          {isConnected && <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-300"><Timer className="h-3 w-3" />{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}
        </div>
        <p aria-live="polite" className={`mt-1 truncate text-sm ${error ? "text-red-200" : "text-slate-100"}`}>{statusText}</p>
      </div>

      {isConnected && <>
        <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute microphone" : "Mute microphone"} title={muted ? "Unmute microphone" : "Mute microphone"} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100">
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <label className="hidden items-center gap-2 sm:flex" aria-label="Voice output volume">
          <Volume2 className="h-4 w-4 text-slate-400" />
          <input aria-label="Voice output volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="w-20 accent-cyan-300" />
        </label>
      </>}
    </div>
  );
}
