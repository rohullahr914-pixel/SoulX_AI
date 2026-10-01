import Image from "next/image";
import { pageMetadata, publicPages } from "@/lib/seo";
export const metadata = pageMetadata("/", publicPages["/"].title, publicPages["/"].description);
import Link from "next/link";
import {
  ArrowRight,
  ChevronUp,
  Crown,
  GitCompareArrows,
  Lightbulb,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { personas } from "@/lib/personas";

const mindsBeyondTime = [
  {
    slug: "nexus",
    category: "Super Intelligence / Multi-Expert AI",
    tagline: "One Mind. Ten Expertises.",
    description: "One focused intelligence for questions across technology, science, business, health, and more.",
    status: "Super Intelligence",
    originalBadge: "SOULX ORIGINAL",
    detailBadge: "10 EXPERTISES",
    cta: "Talk to NEXUS",
    objectPosition: "center",
    cardStyle: "nexus",
  },
  {
    slug: "lyra-voss",
    category: "Future / Civilization",
    tagline: "I come from a world you haven't seen yet.",
    description: "A fictional SoulX human from 2099 exploring future cities, AI, careers, space, and everyday life.",
    status: "Future Human",
    originalBadge: "SOULX FUTURE ORIGINAL",
    detailBadge: "FICTIONAL · YEAR 2099",
    cta: "Enter 2099",
    chatSlug: "lyra-2099",
    objectPosition: "center 43%",
    cardStyle: "lyra",
  },
  {
    slug: "leonardo-da-vinci",
    category: "Art / Science / Invention",
    tagline: "Imagine beyond the limits of your time.",
    description: "Explore creativity, invention, art, and scientific thinking with a Renaissance polymath.",
    status: "Historical Mind",
    originalBadge: undefined,
    detailBadge: undefined,
    cta: "Think With Leonardo",
    objectPosition: "center 38%",
    cardStyle: "leonardo",
  },
  {
    slug: "nikola-tesla",
    category: "Technology / Invention",
    tagline: "The present is theirs. The future is mine.",
    description: "Explore electricity, engineering, energy, and visionary ideas through Tesla's perspective.",
    status: "Historical Mind",
    originalBadge: undefined,
    detailBadge: undefined,
    cta: "Talk to Tesla",
    objectPosition: "center 38%",
    cardStyle: "tesla",
  },
  {
    slug: "cleopatra",
    category: "Leadership / Strategy / History",
    tagline: "Power is built through intelligence.",
    description: "Consider leadership, diplomacy, negotiation, and strategy through ancient Egypt's queen.",
    status: "Historical Mind",
    originalBadge: undefined,
    detailBadge: undefined,
    cta: "Speak With Cleopatra",
    objectPosition: "center 38%",
    cardStyle: "cleopatra",
  },
  {
    slug: "marcus-aurelius",
    category: "Philosophy / Life / Leadership",
    tagline: "Master your mind before the world.",
    description: "Find a Stoic perspective on discipline, purpose, resilience, and leadership.",
    status: "Historical Mind",
    originalBadge: undefined,
    detailBadge: undefined,
    cta: "Ask Marcus",
    objectPosition: "center 28%",
    cardStyle: "marcus",
  },
] as const;

const communityCards = [
  { label: "Top creator", value: "The Curiosity Lab", meta: "12 personas · 8.4k followers", icon: Crown, href: "/community" },
  { label: "Weekly challenge", value: "The impossible brief", meta: "2,418 minds thinking together", icon: Lightbulb, href: "/challenges" },
  { label: "Leaderboard", value: "Maya Chen  ·  #01", meta: "+2,840 XP this week", icon: ChevronUp, href: "/leaderboard" },
];
const roomHighlights = [
  { title: "Multi-Persona Conversations", description: "Talk with multiple personas in one room.", icon: MessagesSquare },
  { title: "Contrasting Perspectives", description: "Compare ideas, knowledge, and viewpoints instantly.", icon: GitCompareArrows },
  { title: "Smarter Group Dialogue", description: "Create richer conversations with more than one mind.", icon: Sparkles },
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <Image
          src="/brand/soulx-human-ai-hero.png"
          alt="A human hand and an AI hand connecting above a futuristic city"
          fill
          preload
          sizes="100vw"
          className="home-hero-image"
        />
        <div className="home-hero-backdrop" aria-hidden="true" />

        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <div className="home-eyebrow" aria-label="SoulX live network">
              <span className="home-eyebrow-dot" aria-hidden="true" />
              One space. Many perspectives.
            </div>
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

      <section className="home-section minds-section">
        <div className="home-section-header home-section-header-inline">
          <div>
            <p className="section-kicker">PAST · PRESENT · FUTURE</p>
            <h2 className="section-title">Minds Beyond Time</h2>
          </div>
          <Link href="/explore" className="section-link">Explore all minds <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="section-subtitle">Meet extraordinary minds from history, intelligence and the future.</p>

        <div className="minds-beyond-time-grid">
          {mindsBeyondTime.map((featured) => {
            const persona = personas.find((item) => item.slug === featured.slug)!;
            const displayName = featured.slug === "cleopatra" ? "Cleopatra" : persona.name;

            return (
              <article key={persona.id} className={`minds-card minds-card--${featured.cardStyle}`}>
                <div className="minds-card-image-wrap">
                  <Image
                    src={persona.avatar}
                    alt={`Portrait representing ${displayName}`}
                    fill
                    sizes="(max-width: 639px) 92vw, (max-width: 959px) 45vw, 370px"
                    quality={78}
                    className="minds-card-image"
                    style={{ objectPosition: featured.objectPosition }}
                  />
                  <div className="minds-card-image-overlay" aria-hidden="true" />
                  <div className="minds-card-topline">
                    <span className="minds-card-status">{featured.status}</span>
                    {featured.originalBadge && <span className="minds-card-original">{featured.originalBadge}</span>}
                  </div>
                  <div className="minds-card-portrait-copy">
                    {featured.detailBadge && <span className="minds-card-detail-badge">{featured.detailBadge}</span>}
                    <h3 className="minds-card-name">
                      <Link href={`/persona/${persona.slug}`} className="minds-card-title-link">
                        {displayName}
                      </Link>
                    </h3>
                  </div>
                </div>
                <div className="minds-card-body">
                  <p className="minds-card-category">{featured.category}</p>
                  <p className="minds-card-tagline">{featured.tagline}</p>
                  <p className="minds-card-description">{featured.description}</p>
                  <Link href={`/chat/${"chatSlug" in featured ? featured.chatSlug : persona.slug}`} className="minds-card-cta">
                    {featured.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-section home-room-preview" aria-labelledby="rooms-heading">
        <div className="rooms-feature-layout">
          <div className="home-room-copy">
            <p className="section-kicker">ROOMS</p>
            <h2 id="rooms-heading" className="section-title">More than one perspective.</h2>
            <p className="section-subtitle">Bring multiple minds into the same conversation.</p>
            <p className="rooms-intro-note">One question can open a conversation across centuries, disciplines, and points of view.</p>
            <Link href="/room" className="rooms-entry-cta">
              Enter a Room
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rooms-artwork-panel">
            <div className="rooms-artwork-topline">
              <span className="rooms-artwork-label"><span aria-hidden="true" />A room in session</span>
              <span className="rooms-artwork-count">06 voices · one conversation</span>
            </div>
            <div className="rooms-artwork-frame">
              <Image
                src="/visuals/rooms-minds.webp"
                alt="Holographic portraits of Einstein, Cleopatra, LYRA-2099, Abraham Lincoln, Marcus Aurelius, and Nikola Tesla linked in one futuristic conversation room"
                width={1600}
                height={686}
                sizes="(max-width: 700px) 94vw, (max-width: 1000px) 90vw, 62vw"
                quality={82}
                loading="lazy"
                className="rooms-artwork-image"
              />
            </div>
            <div className="rooms-artwork-caption">
              <span>Many minds, one shared conversation</span>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="rooms-highlights" aria-label="What you can do in a room">
          {roomHighlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rooms-highlight-card">
              <span className="rooms-highlight-icon"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <div className="rooms-highlight-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
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
