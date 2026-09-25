import type { Persona } from "@/lib/types";

export const personaDomains = [
  { id: "all", label: "All minds", categories: [] },
  { id: "religion", label: "Religion & Spirituality", categories: ["Religion"] },
  { id: "philosophy", label: "Philosophy & Ethics", categories: ["Philosophy"] },
  { id: "science", label: "Science & Medicine", categories: ["Science", "Research", "Education", "Medicine"] },
  { id: "technology", label: "Technology & Innovation", categories: ["Technology", "Artificial Intelligence", "Engineering", "Business"] },
  { id: "leadership", label: "Leadership & Politics", categories: ["Leadership"] },
  { id: "history", label: "History & Strategy", categories: ["History", "Strategy"] },
  { id: "literature", label: "Literature & Poetry", categories: ["Literature"] },
  { id: "arts", label: "Arts & Entertainment", categories: ["Art", "Music", "Film", "Creative"] },
  { id: "sports", label: "Sports & Performance", categories: ["Sports", "Wellness", "Lifestyle"] },
] as const;

export const popularPersonaSlugs = [
  "albert-einstein",
  "leonardo-da-vinci",
  "nikola-tesla",
  "william-shakespeare",
  "marie-curie",
  "alan-turing",
  "steve-jobs",
  "vincent-van-gogh",
  "john-d-rockefeller",
  "alexander-the-great",
  "nexus",
  "sherlock-holmes",
  "michael-jackson",
  "isaac-newton",
  "muhammad-ali",
  "charlie-chaplin",
  "aristotle",
  "ludwig-van-beethoven",
  "wolfgang-amadeus-mozart",
  "freddie-mercury",
  "audrey-hepburn",
  "bruce-lee",
  "pele",
  "diego-maradona",
  "cleopatra",
  "julius-caesar",
  "napoleon-bonaparte",
  "abraham-lincoln",
  "nelson-mandela",
  "mahatma-gandhi",
] as const;

const popularPersonaSlugSet = new Set<string>(popularPersonaSlugs);

export type PersonaDomainId = (typeof personaDomains)[number]["id"];

export function getPersonaDomain(category: string) {
  return personaDomains.find((domain) => domain.id !== "all" && (domain.categories as readonly string[]).includes(category)) ?? personaDomains[0];
}

export function personaMatchesDomain(persona: Persona, domainId: PersonaDomainId) {
  return domainId === "all" || getPersonaDomain(persona.category).id === domainId;
}

export function isPopularPersona(persona: Pick<Persona, "slug">) {
  return popularPersonaSlugSet.has(persona.slug);
}
