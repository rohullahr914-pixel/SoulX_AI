export function safeRedirectPath(value: string | null | undefined, fallback = "/profile") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://soulx.invalid");
    return parsed.origin === "https://soulx.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
