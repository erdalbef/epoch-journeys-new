const PRODUCTION_ORIGIN = "https://www.epochjourneys.com";

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function isTrustedEpochAiOrigin(
  originHeader: string | null,
  environment: string,
  configuredOrigins = "",
): boolean {
  if (!originHeader) return false;

  const incoming = normalizeOrigin(originHeader);
  if (!incoming) return false;

  const trusted = new Set<string>([PRODUCTION_ORIGIN]);

  if (environment !== "production") {
    trusted.add("http://localhost:3000");
  }

  for (const value of configuredOrigins.split(",")) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const normalized = normalizeOrigin(trimmed);
    if (!normalized) continue;

    if (environment === "production" && !normalized.startsWith("https://")) {
      continue;
    }

    trusted.add(normalized);
  }

  return trusted.has(incoming);
}