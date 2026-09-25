import Image from "next/image";
import { pageMetadata, publicPages } from "@/lib/seo";
export const metadata = pageMetadata("/", publicPages["/"].title, publicPages["/"].description);
import Link from "next/link";
import {
  ArrowRight,
  ChevronUp,
  CircleDot,
  Crown,
  Flame,
  Heart,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { getDemoFansWorldwide, personas } from "@/lib/personas";
import { number } from "@/lib/social";

const spotlightSlugs = [
  "albert-einstein",
  "michael-jackson",
  "abraham-lincoln",
  "leonardo-da-vinci",
  "fyodor-dostoevsky",
  "alexander-the-great",
];

const spotlightPersonas = spotlightSlugs.map((slug) => personas.find((persona) => persona.slug === slug)!);
const heroPersonas = spotlightPersonas.slice(0, 3);
const heroFeaturePersonas = [
  personas.find((persona) => persona.slug === "albert-einstein"),
  personas.find((persona) => persona.slug === "michael-jackson"),
  personas.find((persona) => persona.slug === "abraham-lincoln"),
].filter(Boolean) as typeof spotlightPersonas extends Array<infer T> ? T[] : never;

const communityCards = [
  { label: "Top creator", value: "The Curiosity Lab", meta: "12 personas · 8.4k followers", icon: Crown, href: "/community" },
  { label: "Weekly challenge", value: "The impossible brief", meta: "2,418 minds thinking together", icon: Lightbulb, href: "/challenges" },
  { label: "Leaderboard", value: "Maya Chen  ·  #01", meta: "+2,840 XP this week", icon: ChevronUp, href: "/leaderboard" },
];

const heroPortraitClass: Record<string, string> = {
  "albert-einstein": "hero-portrait-einstein",
  "michael-jackson": "hero-portrait-jackson",
  "abraham-lincoln": "hero-portrait-lincoln",
};

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-backdrop" />

        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <h1 className="home-headline">
              A world of minds.
              <span>Ready to talk.</span>
            </h1>

            <p className="home-description">
              Meet iconic thinkers, creators and characters.
              <span>Create your own, or bring multiple minds into one room.</span>
            </p>

            <div className="home-cta-row">
              <Link href="/explore" className="home-primary-cta">
                Explore Minds
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/create" className="home-secondary-cta">
                Create a Mind
              </Link>
            </div>
          </div>

          <div className="home-hero-visual">
            <div className="hero-persona-orbit" aria-hidden="true" />
            <div className="home-glow" />

            {heroFeaturePersonas.map((persona, index) => {
              const positionClass = ["home-card-center", "home-card-top-right", "home-card-bottom-left"][index];
              const isCenter = index === 0;

              return (
                <div key={persona.id} className={`home-hero-card ${isCenter ? "hero-card-center" : "hero-card-side"} ${positionClass}`}>
                  <div className="h-full">
                    <Link href={`/persona/${persona.slug}`} className="group block h-full rounded-[26px] border border-white/15 bg-slate-950/80 p-2.5 shadow-[0_20px_56px_rgba(2,8,23,0.55)] backdrop-blur-xl transition duration-300 hover:border-cyan-200/30">
                      <div className="hero-persona-media relative aspect-4/5 overflow-hidden rounded-[22px]">
                        <Image src={persona.avatar} alt={persona.name} fill sizes="(max-width: 640px) 55vw, 320px" preload={isCenter} className={`hero-persona-image ${heroPortraitClass[persona.slug] ?? ""}`} />
                        <div className="hero-persona-gradient" />
                        <span className="hero-persona-tag">{persona.category}</span>
                      </div>
                      <div className="px-1 pb-1 pt-2.5">
                        <p className="truncate text-sm font-semibold text-white">{persona.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{persona.profession}</p>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}

            <div className="hero-online-pill">
              <CircleDot className="h-3 w-3 text-emerald-300" /> 1,248 minds online
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stats-grid">
          <div>
            <p className="stat-value">100<span className="stat-accent">+</span></p>
            <p className="stat-label">AI personas</p>
          </div>
          <div>
            <p className="stat-value">∞</p>
            <p className="stat-label">Ways to think</p>
          </div>
          <div>
            <p className="stat-value">24<span className="stat-accent">/</span>7</p>
            <p className="stat-label">Fast responses</p>
          </div>
          <div>
            <p className="stat-value">1</p>
            <p className="stat-label">Curious community</p>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header home-section-header-inline">
          <div>
            <p className="section-kicker">The starting point</p>
            <h2 className="section-title">Meet remarkable minds.</h2>
          </div>
          <Link href="/explore" className="section-link">Explore the full library <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="section-subtitle">Explore perspectives from science, art, history, literature and beyond.</p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {spotlightPersonas.map((persona) => (
            <article key={persona.id} className="persona-card">
              <div className="persona-card-image-wrap">
                <Image src={persona.avatar} alt={persona.name} fill sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 400px" className="persona-card-image" />
                <div className="persona-card-image-overlay" />
                <div className="persona-card-topline">
                  <span className="persona-pill">{persona.category}</span>
                  <span className="persona-fans-pill"><Flame className="h-3 w-3 text-orange-300" /> {number(getDemoFansWorldwide(persona))} fans</span>
                </div>
                <div className="persona-card-bottomline">
                  <p className="persona-card-mini">{persona.expertise[0]}</p>
                  <h3>{persona.name}</h3>
                </div>
              </div>
              <div className="persona-card-body">
                <p className="persona-card-copy">{persona.shortDescription}</p>
                <Link href={`/persona/${persona.slug}`} className="text-sm text-cyan-200">About {persona.name}</Link>
                <div className="persona-card-footer">
                  <span className="persona-footer-meta"><Heart className="h-3.5 w-3.5 text-rose-300/80" /> {number(getDemoFansWorldwide(persona))} fans worldwide</span>
                  <Link href={`/chat/${persona.slug}`} className="persona-chat-link">Start Chat <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-room-preview">
        <div className="home-room-copy">
          <p className="section-kicker">Rooms</p>
          <h2 className="section-title">More than one perspective.</h2>
          <p className="section-subtitle">Bring multiple minds into the same conversation.</p>
        </div>

        <div className="rooms-preview-shell">
          <div className="rooms-collage">
            {[heroPersonas[0], heroPersonas[2], heroPersonas[1]].map((persona, index) => (
              <div key={persona.id} className={`rooms-avatar rooms-avatar-${index + 1}`}>
                <Image src={persona.avatar} alt={persona.name} width={160} height={200} sizes="160px" />
              </div>
            ))}
            <div className="rooms-conversation">
              <div className="rooms-conversation-ring" />
              <div className="rooms-conversation-inner">
                <Sparkles className="h-5 w-5 text-cyan-200" />
              </div>
            </div>
          </div>
          <div className="rooms-footer-row">
            <div>
              <span className="rooms-pill">Multi-persona conversations</span>
            </div>
            <Link href="/room" className="home-secondary-cta rooms-cta">Enter a Room</Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-feature-grid">
          <div className="home-feature-panel feature-panel-text">
            <p className="section-kicker">Create</p>
            <h2 className="section-title">Create a mind of your own.</h2>
            <p className="section-subtitle">Define its personality, knowledge and perspective — then share it with the world.</p>
            <Link href="/create" className="home-primary-cta home-primary-cta-small">Create a Mind</Link>
          </div>

          <div className="home-feature-panel feature-panel-stats">
            <div className="mini-stat">
              <span className="mini-stat-label">Voice</span>
              <strong>Distinct</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-label">Knowledge</span>
              <strong>Curated</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-label">Perspective</span>
              <strong>Original</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="community-panel">
          <div>
            <p className="section-kicker">Community</p>
            <h2 className="section-title">Where minds meet people.</h2>
            <p className="section-subtitle">Discover conversations, creators, challenges and ideas from the SoulX community.</p>
          </div>

          <div className="community-preview-grid">
            {communityCards.map(({ label, value, meta, icon: Icon, href }) => (
              <Link key={label} href={href} className="community-preview-card">
                <div className="community-preview-head">
                  <span>{label}</span>
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
                <p className="community-preview-value">{value}</p>
                <div className="community-preview-meta">
                  <span>{meta}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>

          <Link href="/community" className="home-secondary-cta community-button">Explore Community</Link>
        </div>
      </section>

      <p className="home-scroll-reveal-statement">Every perspective changes the conversation.</p>

      <section className="home-final-cta home-final-cta--shine">
        <div className="home-final-copy">
          <span className="section-kicker section-kicker-light">Your next perspective</span>
          <h2>Who will you talk to first?</h2>
          <p>Explore a growing world of minds — or create your own.</p>
        </div>
        <div className="home-final-actions">
          <Link href="/explore" className="home-primary-cta">
            Explore Minds
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/create" className="home-secondary-cta">
            Create a Mind
          </Link>
        </div>
      </section>
    </main>
  );
}
