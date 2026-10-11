"use client";

function AppleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M16.7 12.8c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-1.9-.9-3.2-.9-1.6 0-3.2 1-4 2.5-1.7 3-.4 7.5 1.2 10 .8 1.2 1.8 2.5 3.1 2.4 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-4.1ZM14.2 5.6c.7-.9 1.2-2.1 1-3.3-1 .1-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.1-1.5Z" /></svg>;
}

function GitHubMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 .7A11.5 11.5 0 0 0 8.4 23c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.6-1.4-5.6-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.9 0C15 5.7 16 6 16 6c.6 1.5.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.9 5.4-5.6 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .7Z" /></svg>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.5c2-1.9 2.7-4.6 2.7-7.7Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.4l-3.4-2.7c-.9.6-2.1 1-3.4 1a6 6 0 0 1-5.6-4.1H2.9v2.8A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.4H2.9a10 10 0 0 0 0 9.2l3.5-2.8Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9.1 5.4l3.5 2.8A6 6 0 0 1 12 6.1Z"/></svg>;
}

const providers = [
  { id: "google", label: "Google", icon: GoogleMark },
  { id: "apple", label: "Apple", icon: AppleMark },
  { id: "github", label: "GitHub", icon: GitHubMark },
] as const;

export function SocialAuthButtons({ next = "/profile" }: { next?: string }) {
  return <div className="grid gap-2 sm:grid-cols-3">{providers.map(({ id, label, icon: Icon }) => <a key={id} href={`/api/auth/oauth?provider=${id}&next=${encodeURIComponent(next)}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><Icon />{label}</a>)}</div>;
}
