import "server-only";

/**
 * Inspect a cloned request stream so that the route can still parse
 * the original JSON or multipart form after validation.
 */
export async function isRequestWithinLimit(
  request: Request,
  maxBytes: number,
): Promise<boolean> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Invalid request size limit.");
  }

  const lengthHeader = request.headers.get("content-length");

  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader)) return false;
    const length = Number(lengthHeader);
    if (!Number.isSafeInteger(length) || length > maxBytes) return false;
  }

  const reader = request.clone().body?.getReader();
  if (!reader) return true;

  let total = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) return true;

      total += result.value.byteLength;
      if (total > maxBytes) return false;
    }
  } finally {
    // A cloned request uses a tee stream. Awaiting cancellation may block
    // until the original request body is consumed, so cancel asynchronously.
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}