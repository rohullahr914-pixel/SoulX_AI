import type { PersonaMode } from "@/lib/types";

export const navigationItems = [
  { label: "Explore", href: "/explore" },
  { label: "Personas", href: "/explore" },
  { label: "Rooms", href: "/room" },
  { label: "Create", href: "/create" },
  { label: "Research", href: "/research" },
  { label: "About", href: "/about" },
];

export const personaCategories = [
  "History",
  "Science",
  "Technology",
  "Engineering",
  "Artificial Intelligence",
  "Mathematics",
  "Film",
  "Philosophy",
  "Literature",
  "Writing",
  "Art",
  "Music",
  "Business",
  "Entrepreneurship",
  "Leadership",
  "Education",
  "Psychology",
  "Medicine",
  "Economics",
  "Politics & History",
  "Creativity",
  "Innovation",
  "Sports",
  "Exploration",
  "Mentorship",
  "Productivity",
];

export const conversationModes: PersonaMode[] = [
  "Casual",
  "Expert",
  "Tutor",
  "Mentor",
  "Debate",
  "Interview",
  "Research",
  "Creative",
];

export const featureCards = [
  {
    title: "AI Personas",
    description: "Historical figures, experts, creators, and custom minds.",
    icon: "brain",
  },
  {
    title: "Personalized Chat",
    description: "Sharper, role-specific conversations tailored to the persona.",
    icon: "messages",
  },
  {
    title: "Memory",
    description: "Continuity across chats with a clean memory architecture.",
    icon: "memory",
  },
  {
    title: "Research Mode",
    description: "Ground responses with evidence-aware research workflows.",
    icon: "search",
  },
  {
    title: "Rooms",
    description: "Bring multiple perspectives into one discussion stream.",
    icon: "users",
  },
  {
    title: "Custom Persona Builder",
    description: "Design a digital mind with your own rules and style.",
    icon: "sparkles",
  },
  {
    title: "Conversation Modes",
    description: "Switch between tutoring, debate, mentorship, and more.",
    icon: "layers",
  },
  {
    title: "Multilingual AI",
    description: "English, Persian, Dari, Arabic, Turkish, Spanish, French, and German.",
    icon: "globe",
  },
];

export const personaHighlights = [
  "Albert Einstein",
  "Leonardo da Vinci",
  "Nikola Tesla",
  "William Shakespeare",
  "Vincent van Gogh",
  "Marie Curie",
  "Alan Turing",
  "Steve Jobs",
  "Socrates",
  "Rumi",
  "Fyodor Dostoevsky",
];
