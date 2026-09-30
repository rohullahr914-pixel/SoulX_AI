import type { Persona } from "@/lib/types";

export type RoomVisibility = "Public" | "Private";

export type RoomPersona = Pick<Persona, "slug" | "name" | "avatar" | "profession" | "category" | "expertise" | "speakingStyle">;

export type Room = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  topic: string;
  coverImage: string;
  visibility: RoomVisibility;
  isOfficial: boolean;
  starterPrompt: string;
  personas: RoomPersona[];
  creatorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastActivity?: string | null;
};

export type RoomMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  personaSlug?: string | null;
  createdAt: string;
};

export const OFFICIAL_ROOMS: Room[] = [
  {
    name: "Genius Room", slug: "genius-room", description: "Minds That Changed the World",
    topic: "Science · Invention · Physics · Future", coverImage: "/rooms/genius-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "What invention could change humanity forever?",
    personas: [
      { slug: "albert-einstein", name: "Albert Einstein" }, { slug: "nikola-tesla", name: "Nikola Tesla" },
      { slug: "leonardo-da-vinci", name: "Leonardo da Vinci" }, { slug: "isaac-newton", name: "Isaac Newton" },
    ] as RoomPersona[],
  },
  {
    name: "Mystery Room", slug: "mystery-room", description: "The Great Investigation",
    topic: "Mystery · Logic · Investigation", coverImage: "/rooms/mystery-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "A mysterious case has arrived. Can you solve it together?",
    personas: [
      { slug: "sherlock-holmes", name: "Sherlock Holmes" }, { slug: "hercule-poirot", name: "Hercule Poirot" }, { slug: "edgar-allan-poe", name: "Edgar Allan Poe" },
    ] as RoomPersona[],
  },
  {
    name: "Leaders Room", slug: "leaders-room", description: "The Strategy Table",
    topic: "History · Leadership · Strategy", coverImage: "/rooms/leaders-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "What makes a leader powerful enough to change history?",
    personas: [
      { slug: "alexander-the-great", name: "Alexander the Great" }, { slug: "julius-caesar", name: "Julius Caesar" },
      { slug: "napoleon-bonaparte", name: "Napoleon Bonaparte" }, { slug: "abraham-lincoln", name: "Abraham Lincoln" },
    ] as RoomPersona[],
  },
  {
    name: "Philosophy Room", slug: "philosophy-room", description: "The Meaning of Life",
    topic: "Philosophy · Life · Ethics · Human Nature", coverImage: "/rooms/philosophy-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "What makes a human life meaningful?",
    personas: [
      { slug: "socrates", name: "Socrates" }, { slug: "plato", name: "Plato" },
      { slug: "marcus-aurelius", name: "Marcus Aurelius" }, { slug: "fyodor-dostoevsky", name: "Fyodor Dostoevsky" },
    ] as RoomPersona[],
  },
  {
    name: "Creators Room", slug: "creators-room", description: "Imagine the Impossible",
    topic: "Art · Creativity · Literature · Music", coverImage: "/rooms/creators-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "Where does true creativity come from?",
    personas: [
      { slug: "leonardo-da-vinci", name: "Leonardo da Vinci" }, { slug: "vincent-van-gogh", name: "Vincent van Gogh" },
      { slug: "william-shakespeare", name: "William Shakespeare" }, { slug: "wolfgang-amadeus-mozart", name: "Wolfgang Amadeus Mozart" },
    ] as RoomPersona[],
  },
  {
    name: "Future Room", slug: "future-room", description: "Humanity 2200",
    topic: "AI · Space · Humanity · Future", coverImage: "/rooms/future-room.webp", visibility: "Public", isOfficial: true,
    starterPrompt: "What will human civilization look like in the year 2200?",
    personas: [
      { slug: "orion-vale", name: "Orion Vale" }, { slug: "nova-chen", name: "Dr. Nova Chen" }, { slug: "aion", name: "AION" },
      { slug: "lyra-voss", name: "Lyra Voss" }, { slug: "mira-sol", name: "Mira Sol" }, { slug: "eva-9", name: "EVA-9" },
    ] as RoomPersona[],
  },
];

export const ROOM_COVER_OPTIONS = OFFICIAL_ROOMS.map((room) => ({ label: room.name, value: room.coverImage }));

export function roomSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export function roomPath(slug: string) {
  return `/room/${encodeURIComponent(slug)}`;
}
