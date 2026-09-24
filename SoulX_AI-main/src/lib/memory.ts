export type MemoryType = "user" | "persona" | "platform";

export type MemoryEntry = {
  id: string;
  type: MemoryType;
  summary: string;
  createdAt: string;
  source: "conversation" | "profile" | "settings";
  relevance: number;
};

export const memorySeed: MemoryEntry[] = [
  {
    id: "mem-1",
    type: "user",
    summary: "Prefers concise explanations and practical examples in technical discussions.",
    createdAt: new Date().toISOString(),
    source: "settings",
    relevance: 0.94,
  },
  {
    id: "mem-2",
    type: "persona",
    summary: "Einstein persona should focus on analogies and conceptual clarity when discussing physics.",
    createdAt: new Date().toISOString(),
    source: "conversation",
    relevance: 0.9,
  },
  {
    id: "mem-3",
    type: "platform",
    summary: "User prefers English for general chats and Persian for reflective or creative prompts.",
    createdAt: new Date().toISOString(),
    source: "settings",
    relevance: 0.82,
  },
];

export function createMemoryEntry(summary: string, options?: Partial<MemoryEntry>) {
  return {
    id: options?.id ?? `mem-${Date.now()}`,
    type: options?.type ?? "user",
    summary,
    createdAt: options?.createdAt ?? new Date().toISOString(),
    source: options?.source ?? "conversation",
    relevance: options?.relevance ?? 0.7,
  } satisfies MemoryEntry;
}

export function retrieveRelevantMemories(entries: MemoryEntry[], query: string) {
  if (!query.trim()) return entries.slice(0, 3);

  const q = query.toLowerCase();

  return [...entries]
    .filter((entry) => entry.summary.toLowerCase().includes(q) || entry.type.toLowerCase().includes(q))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}
