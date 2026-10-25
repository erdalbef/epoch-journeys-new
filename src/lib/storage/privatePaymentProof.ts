import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, get, put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024;
const PRIVATE_PREFIX = "local-private-payment-proofs/";

const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function blobStorageEnabled() {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.BLOB_READ_WRITE_TOKEN?.trim(),
  );
}

function onVercel() {
  return Boolean(process.env.VERCEL_URL || process.env.VERCEL_REGION);
}

function localPath(storagePath: string): string | null {
  if (!storagePath.startsWith(PRIVATE_PREFIX)) return null;
  const fileName = storagePath.substring(PRIVATE_PREFIX.length);
  if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(fileName)) return null;
  return path.join(process.cwd(), ".private", "payment-proofs", fileName);
}

function isPrivateBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "private.blob.vercel-storage.com" ||
        url.hostname.endsWith(".private.blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

function looksLikeMime(bytes: Buffer, type: string) {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return false;
}

export class InvalidProofError extends Error {}

/** Never store customer payment proofs under public/. */
export async function savePrivatePaymentProof(file: File) {
  const ext = MIME_EXTENSIONS[file.type];
  if (!ext || file.size <= 0 || file.size > MAX_SIZE) {
    throw new InvalidProofError("Payment proof must be a JPG, PNG or PDF smaller than 5 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeMime(bytes, file.type)) {
    throw new InvalidProofError("The uploaded file does not match its declared type.");
  }

  const key = randomUUID() + ext;
  if (blobStorageEnabled()) {
    const blob = await put(`payment-proofs/${key}`, bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });
    return blob.url;
  }

  if (onVercel()) {
    throw new Error("Private Blob storage is not configured for production.");
  }

  const dir = path.join(process.cwd(), ".private", "payment-proofs");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir, key), bytes, { mode: 0o600 });
  return PRIVATE_PREFIX + key;
}

export async function deletePrivatePaymentProof(storagePath: string) {
  if (isPrivateBlobUrl(storagePath) && blobStorageEnabled()) {
    await del(storagePath);
    return;
  }
  const local = localPath(storagePath);
  if (local) await unlink(local).catch(() => undefined);
}

export async function readPrivatePaymentProof(storagePath: string): Promise<{
  body: BodyInit;
  contentType: string;
} | null> {
  if (isPrivateBlobUrl(storagePath)) {
    const result = await get(storagePath, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
      body: result.stream as BodyInit,
      contentType: result.blob.contentType || "application/octet-stream",
    };
  }

  const local = localPath(storagePath);
  if (local) {
    const bytes = await readFile(local).catch(() => null);
    if (!bytes) return null;
    const contentType = local.endsWith(".pdf") ? "application/pdf" :
      local.endsWith(".png") ? "image/png" : "image/jpeg";
    return { body: new Uint8Array(bytes), contentType };
  }

  // Existing legacy files: this authenticated route can read them, but
  // their original public URLs must still be migrated and removed separately.
  if (storagePath.startsWith("/uploads/payments/")) {
    const fileName = storagePath.substring("/uploads/payments/".length);
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName) || fileName.includes("..")) return null;
    const file = path.join(process.cwd(), "public", "uploads", "payments", fileName);
    const bytes = await readFile(file).catch(() => null);
    if (!bytes) return null;
    const contentType = fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" :
      /\.png$/i.test(fileName) ? "image/png" : "image/jpeg";
    return { body: new Uint8Array(bytes), contentType };
  }
  return null;
}
