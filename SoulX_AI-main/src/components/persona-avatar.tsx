"use client";

import { useEffect, useState } from "react";

type PersonaAvatarProps = {
  slug: string;
  name: string;
  className?: string;
};

const portraitFiles: Record<string, string[]> = {
  "albert-einstein": ["/personas/einstein.png", "/personas/albert-einstein.png", "/brand/personax-logo.svg"],
  "leonardo-da-vinci": ["/personas/leonardo.png", "/brand/personax-logo.svg"],
  "nikola-tesla": ["/personas/tesla.png", "/brand/personax-logo.svg"],
  "william-shakespeare": ["/personas/shakespeare.png", "/brand/personax-logo.svg"],
  "marie-curie": ["/personas/curie.png", "/brand/personax-logo.svg"],
  "alan-turing": ["/personas/turing.png", "/brand/personax-logo.svg"],
  socrates: ["/personas/socrates.png", "/brand/personax-logo.svg"],
  rumi: ["/personas/rumi.png", "/brand/personax-logo.svg"],
  "steve-jobs": ["/personas/jobs.png", "/brand/personax-logo.svg"],
  "vincent-van-gogh": ["/personas/gogh.png", "/brand/personax-logo.svg"],
  "john-d-rockefeller": ["/personas/rockefeller.svg", "/brand/personax-logo.svg"],
  "alexander-the-great": ["/personas/alexander-the-great.jpg", "/brand/personax-logo.svg"],
  "fyodor-dostoevsky": ["/personas/fyodor-dostoevsky.jpg", "/brand/personax-logo.svg"],
  nexus: ["/personas/nexus.svg", "/brand/personax-logo.svg"],
  "sherlock-holmes": ["/personas/sherlock-holmes.jpg", "/brand/personax-logo.svg"],
  "michael-jackson": ["/personas/michael-jackson.png", "/personas/michael-jackson.jpg", "/brand/personax-logo.svg"],
  "isaac-newton": ["/personas/isaac-newton.jpg", "/brand/personax-logo.svg"],
  "muhammad-ali": ["/personas/muhammad-ali.jpg", "/brand/personax-logo.svg"],
  "charlie-chaplin": ["/personas/charlie-chaplin.jpg", "/brand/personax-logo.svg"],
  aristotle: ["/personas/aristotle-portrait.jpg", "/brand/personax-logo.svg"],
  "abraham-lincoln": ["/personas/historical/abraham-lincoln.jpg", "/personas/abraham-lincoln.jpg", "/brand/personax-logo.svg"],
};

const historicalPortraitSlugs = new Set([
  "ludwig-van-beethoven", "jesus-christ", "moses", "gautama-buddha", "confucius", "laozi", "zoroaster", "wolfgang-amadeus-mozart", "freddie-mercury", "audrey-hepburn", "bruce-lee", "pele", "diego-maradona", "ibn-sina", "al-khwarizmi", "ibn-khaldun", "ibn-rushd", "saladin", "cyrus-the-great", "darius-the-great", "hammurabi", "cleopatra", "julius-caesar", "augustus", "marcus-aurelius", "plato", "pythagoras", "archimedes", "hippocrates", "galen", "hypatia", "sun-tzu", "genghis-khan", "kublai-khan", "ashoka", "akbar-the-great", "shah-jahan", "babur", "mehmed-the-conqueror", "suleiman-the-magnificent", "joan-of-arc", "charlemagne", "richard-the-lionheart", "william-the-conqueror", "elizabeth-i", "queen-victoria", "napoleon-bonaparte", "george-washington", "abraham-lincoln", "nelson-mandela", "mahatma-gandhi", "martin-luther-king-jr", "winston-churchill", "mustafa-kemal-ataturk", "simon-bolivar", "toussaint-louverture", "frederick-douglass", "harriet-tubman", "florence-nightingale", "ada-lovelace", "charles-darwin", "galileo-galilei", "nicolaus-copernicus", "johannes-kepler", "louis-pasteur", "michael-faraday", "james-clerk-maxwell", "niels-bohr", "max-planck", "richard-feynman", "rosalind-franklin", "katherine-johnson", "rabindranath-tagore", "omar-khayyam", "hafez", "ferdowsi", "saadi-shirazi", "johann-wolfgang-von-goethe", "jane-austen", "frida-kahlo",
]);

export function PersonaAvatar({ slug, name, className = "" }: PersonaAvatarProps) {
  const portraitCandidates = portraitFiles[slug] ?? (historicalPortraitSlugs.has(slug) ? [`/personas/historical/${slug}.jpg`, "/brand/personax-logo.svg"] : ["/brand/personax-logo.svg"]);
  const [imageIndex, setImageIndex] = useState(0);

  // Reset the fallback when the persona changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setImageIndex(0), [slug]);

  const portrait = portraitCandidates[Math.min(imageIndex, portraitCandidates.length - 1)];
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 ${className}`}>
      {portrait ? (
        <img
          src={portrait}
          alt={name}
          onError={() => setImageIndex((current) => Math.min(current + 1, portraitCandidates.length - 1))}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-black text-white" aria-label={name}>
          {initials || "AI"}
        </span>
      )}
    </div>
  );
}
