import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { safePublicUrl } from "./hotelWebResearch";

export const MAX_HOTEL_PAGE_BYTES = 512 * 1024;
export const HOTEL_PAGE_TIMEOUT_MS = 6500;

export type HotelFetchedPage = {
  sourceUrl: string;
  html: string;
  status: "retrieved-unverified";
  contentType: "text/html";
};

export function isPublicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;

  const parts = address.split(".").map(Number);
  const [a, b, c] = parts;

  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  ) {
    return false;
  }

  return true;
}

export function validateHotelPageUrl(value: string): URL {
  const safe = safePublicUrl(value);

  if (!safe) throw new Error("Unsafe hotel website URL");

  const url = new URL(safe);

  if (isIP(url.hostname) !== 0) {
    throw new Error("IP literal URLs are not permitted");
  }

  if (
    url.hostname.length > 253 ||
    !/^[a-z0-9.-]+$/i.test(url.hostname) ||
    url.hostname.startsWith("-") ||
    url.hostname.endsWith("-") ||
    url.hostname.includes("..")
  ) {
    throw new Error("Invalid hotel website hostname");
  }

  return url;
}

/**
 * Fetch public HTML without following redirects.
 *
 * DNS resolution occurs before connecting. The HTTPS request uses
 * a pinned, already-validated IPv4 address to prevent a second DNS
 * lookup from changing the destination.
 *
 * Retrieved content remains untrusted until Admin verification.
 */
export async function fetchHotelPublicPage(
  source: string
): Promise<HotelFetchedPage> {
  const url = validateHotelPageUrl(source);
  const startedAt = Date.now();

  let dnsTimer: ReturnType<typeof setTimeout> | undefined;

  const addresses = await Promise.race([
    lookup(url.hostname, { family: 4, all: true }),
    new Promise<never>((_resolve, reject) => {
      dnsTimer = setTimeout(
        () => reject(new Error("Hotel DNS lookup timed out")),
        HOTEL_PAGE_TIMEOUT_MS
      );
    })
  ]).finally(() => {
    if (dnsTimer) clearTimeout(dnsTimer);
  });

  if (
    addresses.length === 0 ||
    addresses.length > 20 ||
    addresses.some(item =>
      item.family !== 4 || !isPublicIPv4(item.address)
    )
  ) {
    throw new Error("Hotel website has no acceptable public IPv4 address");
  }

  const pinnedAddress = addresses[0].address;
  const remainingMs = HOTEL_PAGE_TIMEOUT_MS - (Date.now() - startedAt);

  if (remainingMs <= 0) {
    throw new Error("Hotel website retrieval timed out");
  }

  return new Promise<HotelFetchedPage>((resolve, reject) => {
    let settled = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      if (deadline) clearTimeout(deadline);
      reject(error);
    };

    const req = request(url, {
      method: "GET",
      timeout: HOTEL_PAGE_TIMEOUT_MS,
      maxHeaderSize: 16384,
      headers: {
        Accept: "text/html",
        "Accept-Encoding": "identity",
        "User-Agent": "EpochJourneysHotelResearch/1.0"
      },
      lookup: (_hostname, _options, callback) => {
        const done = callback as (
          error: NodeJS.ErrnoException | null,
          address: string,
          family: number
        ) => void;

        done(null, pinnedAddress, 4);
      }
    }, response => {
      const status = response.statusCode || 0;

      if (status >= 300 && status < 400) {
        response.destroy();
        fail(new Error("Hotel website redirect requires separate review"));
        return;
      }

      if (status !== 200) {
        response.destroy();
        fail(new Error(`Hotel website returned HTTP ${status}`));
        return;
      }

      const contentType = response.headers["content-type"] || "";

      if (!/^text\/html(?:\s*;|$)/i.test(contentType)) {
        response.destroy();
        fail(new Error("Hotel page is not HTML"));
        return;
      }

      const declaredSize = Number(response.headers["content-length"]);

      if (
        Number.isFinite(declaredSize) &&
        declaredSize > MAX_HOTEL_PAGE_BYTES
      ) {
        response.destroy();
        fail(new Error("Hotel page exceeds maximum allowed size"));
        return;
      }

      const chunks: Buffer[] = [];
      let bytes = 0;

      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;

        if (bytes > MAX_HOTEL_PAGE_BYTES) {
          response.destroy();
          fail(new Error("Hotel page exceeds maximum allowed size"));
          return;
        }

        chunks.push(chunk);
      });

      response.on("end", () => {
        if (settled) return;
        settled = true;
        if (deadline) clearTimeout(deadline);

        resolve({
          sourceUrl: url.href,
          html: Buffer.concat(chunks).toString("utf8"),
          status: "retrieved-unverified",
          contentType: "text/html"
        });
      });

      response.on("error", error => fail(error));
    });

    req.on("timeout", () => {
      req.destroy(new Error("Hotel website retrieval timed out"));
    });

    req.on("error", error => fail(error));

    deadline = setTimeout(() => {
      const error = new Error("Hotel website retrieval timed out");
      req.destroy(error);
      fail(error);
    }, remainingMs);

    req.end();
  });
}