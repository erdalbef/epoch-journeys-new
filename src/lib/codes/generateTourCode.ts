import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

const MAX_DB_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [700, 1400];

function normalize(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTransientDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("can't reach database server") ||
      message.includes("cannot reach database server") ||
      message.includes("connection terminated") ||
      message.includes("connection closed") ||
      message.includes("connection reset") ||
      message.includes("econnreset") ||
      message.includes("etimedout")
    );
  }

  return false;
}

async function findTourByCodeWithRetry(
  tourCode: string
): Promise<{ id: string } | null> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt++) {
    try {
      return await db.tour.findFirst({
        where: {
          tourCode,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      lastError = error;

      const shouldRetry =
        isTransientDatabaseConnectionError(error) &&
        attempt < MAX_DB_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }

      const delay =
        RETRY_DELAYS_MS[
          Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)
        ] ?? 1400;

      console.warn(
        `Tour code database lookup failed for "${tourCode}". ` +
          `Retrying (${attempt}/${MAX_DB_ATTEMPTS}) in ${delay}ms.`
      );

      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to check tour code availability.");
}

export async function generateTourCode(
  title: string
): Promise<string> {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let base = "TR";

  if (words.length >= 2) {
    base =
      normalize(words[0].slice(0, 2)) +
      normalize(words[1].slice(0, 2));
  } else if (words.length === 1) {
    base = normalize(words[0].slice(0, 4));
  }

  if (!base) {
    base = "TR";
  }

  let counter = 1;

  while (true) {
    const candidate = `${base}${counter}`;

    const exists = await findTourByCodeWithRetry(candidate);

    if (!exists) {
      return candidate;
    }

    counter++;
  }
}
