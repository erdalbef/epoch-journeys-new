export function isTrustedEpochAiOrigin(
  origin: string | null,
  config: {
    nextAuthUrl?: string;
    publicAppUrl?: string;
    allowedOrigin?: string;
  } = {}
): boolean {
  if (!origin) return false;

  let requestOrigin: URL;

  try {
    requestOrigin = new URL(origin);
    if (requestOrigin.origin !== origin) return false;
  } catch {
    return false;
  }

  const trusted = [
    config.nextAuthUrl,
    config.publicAppUrl,
    config.allowedOrigin,
  ];

  return trusted.some((value) => {
    if (!value) return false;

    try {
      const url = new URL(value);
      const local = url.hostname === "localhost" ||
        url.hostname === "127.0.0.1";

      if (url.protocol !== "https:" &&
          !(local && url.protocol === "http:")) {
        return false;
      }

      return requestOrigin.origin === url.origin;
    } catch {
      return false;
    }
  });
}
