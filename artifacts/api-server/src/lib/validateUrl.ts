/**
 * Validates that a URL loaded from config is a proper http/https URL.
 * Prevents non-HTTP protocols (file://, gopher://, javascript://, etc.)
 * from being used in server-side fetch calls.
 */
export function isValidServiceUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
