export type PersonaMode =
  | "Casual"
  | "Expert"
  | "Tutor"
  | "Mentor"
  | "Debate"
  | "Interview"
  | "Research"
  | "Creative";

export type PersonaVisibility = "Public" | "Private";

export type Persona = {
  id: string;
  name: string;
  slug: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage: string;
  shortDescription: string;
  description: string;
  biography: string;
  profession: string;
  expertise: string[];
  era: string;
  birthYear?: number;
  deathYear?: number;
  country: string;
  region: string;
  languages: string[];
  personality: string[];
  speakingStyle: string;
  tone: string;
  knowledge: string[];
  beliefs: string[];
  principles: string[];
  rules: string[];
  restrictions: string[];
  category: string;
  categoryId: string;
  tags: string[];
  visibility: PersonaVisibility;
  isFeatured: boolean;
  isVerified: boolean;
  creatorId?: string;
  metadata: Record<string, string | number | boolean | string[]>;
  suggestedPrompts: string[];
  disclaimer: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  language: "en" | "fa" | "ar" | "tr" | "es" | "fr" | "de";
  preferredMode: PersonaMode;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ChatRequest = {
  personaId: string;
  message: string;
  mode: PersonaMode;
  history?: ConversationMessage[];
  language?: string;
};
