function supportBlobPrefix(): string {
  const prefix = process.env.SUPPORT_BLOB_PREFIX?.trim();

  const environment = process.env.EPOCH_ENV?.trim();

  if (
    environment !== "isolated-test" &&
    environment !== "production"
  ) {
    throw new Error("EPOCH_ENV must be explicitly configured.");
  }

  if (
    environment === "isolated-test" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error(
      "Isolated-test storage cannot run in a production deployment."
    );
  }

  const expected =
    environment === "production"
      ? "support"
      : "support/test";

  if (prefix !== expected) {
    throw new Error(
      `Invalid Support Blob prefix for ${environment}.`
    );
  }

  return prefix;
}
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
]);

const LOCAL_PREFIX = "private:support/";

function blobEnabled() {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.BLOB_READ_WRITE_TOKEN?.trim()
  );
}

function onVercel() {
  return Boolean(process.env.VERCEL_URL || process.env.VERCEL_REGION);
}

function localFilename(value: string): string | null {
  if (!value.startsWith(LOCAL_PREFIX)) return null;

  const filename = value.substring(LOCAL_PREFIX.length);

  if (!/^[a-f0-9-]{36}\.(pdf|doc|docx|xls|xlsx|csv)$/i.test(filename)) {
    return null;
  }

  return filename;
}

function privateBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (
        url.hostname === "private.blob.vercel-storage.com" ||
        url.hostname.endsWith(".private.blob.vercel-storage.com")
      )
    );
  } catch {
    return false;
  }
}

export async function saveSupportAttachment(file: File): Promise<string> {
  const extension = path.extname(file.name).toLowerCase();

  if (
    !EXTENSIONS.has(extension) ||
    file.size <= 0 ||
    file.size > MAX_BYTES
  ) {
    throw new Error("Invalid Support attachment type or size.");
  }

  const filename = randomUUID() + extension;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (blobEnabled()) {
    const blob = await put(`${supportBlobPrefix()}/${filename}`, bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });

    return blob.url;
  }

  if (onVercel()) {
    throw new Error(
      "Private Support Blob storage is not configured for production."
    );
  }

  const directory = path.join(process.cwd(), "private", "support");

  await mkdir(directory, {
    recursive: true,
    mode: 0o700,
  });

  await writeFile(path.join(directory, filename), bytes, {
    flag: "wx",
    mode: 0o600,
  });

  return LOCAL_PREFIX + filename;
}

export async function readSupportAttachment(
  storagePath: string
): Promise<BodyInit | null> {
  if (privateBlobUrl(storagePath)) {
    if (!blobEnabled()) return null;

    const result = await get(storagePath, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    return result.stream as BodyInit;
  }

  const filename = localFilename(storagePath);

  if (filename) {
    const filePath = path.join(
      process.cwd(),
      "private",
      "support",
      filename
    );

    const bytes = await readFile(filePath).catch(() => null);

    return bytes ? new Uint8Array(bytes) : null;
  }

  // Legacy paths must be migrated to private storage.
  // Never serve them directly from a public URL.
  return null;
}
