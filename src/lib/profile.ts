const profileListeners = new Set<() => void>();
let profileStore: ProfilePreferencesStore = {};
let snapshot = "";

export type LikedMessage = { id: string; personaName: string; personaSlug?: string; content: string; savedAt: string };
export type ProfilePreferences = {
  avatarDataUrl?: string;
  favoritePersonaSlug?: string;
  favoritePersonaSlugs?: string[];
  displayName?: string;
  bio?: string;
  profileVisibility?: "Public" | "Private";
  quote?: string;
  quoteVisibility?: "Public" | "Private";
  pinnedConversations?: Array<{ id: string; title: string; personaName: string; preview: string; date: string }>;
  likedMessages?: LikedMessage[];
};
type ProfilePreferencesStore = Record<string, ProfilePreferences>;

function publish() {
  snapshot = JSON.stringify(profileStore);
  profileListeners.forEach((listener) => listener());
}

export function subscribeToProfile(listener: () => void) {
  profileListeners.add(listener);
  return () => profileListeners.delete(listener);
}

export function getProfilePreferencesSnapshot() { return snapshot; }
export function getProfilePreferences(userId: string) { return profileStore[userId] ?? {}; }

export async function refreshProfilePreferences(userId: string) {
  const response = await fetch("/api/profile", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return;
  const data = await response.json() as { profile: ProfilePreferences };
  profileStore = { ...profileStore, [userId]: data.profile };
  publish();
}

export function clearProfilePreferences() {
  profileStore = {};
  publish();
}

export function saveProfilePreferences(userId: string, preferences: ProfilePreferences) {
  profileStore = { ...profileStore, [userId]: { ...profileStore[userId], ...preferences } };
  publish();
  const payload = { ...preferences, avatarDataUrl: preferences.avatarDataUrl };
  void fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) }).then((response) => {
    if (!response.ok) void refreshProfilePreferences(userId);
  });
}

export function getFavoritePersonaSlugs(preferences: ProfilePreferences) {
  const legacy = preferences.favoritePersonaSlug ? [preferences.favoritePersonaSlug] : [];
  return [...new Set([...(preferences.favoritePersonaSlugs ?? []), ...legacy])];
}

export function toggleFavoritePersona(userId: string, slug: string) {
  const preferences = getProfilePreferences(userId);
  const current = getFavoritePersonaSlugs(preferences);
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  profileStore = { ...profileStore, [userId]: { ...preferences, favoritePersonaSlugs: next, favoritePersonaSlug: undefined } };
  publish();
  void fetch("/api/profile/favorites/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ slug }) }).then((response) => {
    if (!response.ok) void refreshProfilePreferences(userId);
  });
  return next;
}

export function toggleLikedMessage(userId: string, message: Omit<LikedMessage, "savedAt">) {
  const preferences = getProfilePreferences(userId);
  const current = preferences.likedMessages ?? [];
  const next = current.some((item) => item.id === message.id) ? current.filter((item) => item.id !== message.id) : [{ ...message, savedAt: new Date().toISOString() }, ...current];
  profileStore = { ...profileStore, [userId]: { ...preferences, likedMessages: next } };
  publish();
  void fetch("/api/profile/liked-messages/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(message) }).then((response) => {
    if (!response.ok) void refreshProfilePreferences(userId);
  });
  return next;
}

export function removeProfileAvatar(userId: string) {
  profileStore = { ...profileStore, [userId]: { ...profileStore[userId], avatarDataUrl: undefined } };
  publish();
  void fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ avatarDataUrl: null }) });
}
