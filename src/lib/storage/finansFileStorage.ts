import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

type SaveFinanceFileInput = {
  file: File;
  year: number;
  month: number;
  safeFileName: string;
};

type SavedFinanceFile = {
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  localAbsolutePath: string | null;
};

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveFinanceFile({
  file,
  year,
  month,
  safeFileName,
}: SaveFinanceFileInput): Promise<SavedFinanceFile> {
  const originalFileName = file.name || safeFileName;
  const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const monthFolder = String(month).padStart(2, "0");
  const blobPath = `accounting/${year}/${monthFolder}/${storedFileName}`;

  if (blobStorageEnabled()) {
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });

    return {
      originalFileName,
      storedFileName,
      storagePath: blob.url,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      localAbsolutePath: null,
    };
  }

  if (isVercelRuntime()) {
    throw new Error(
      "File storage is not configured. Add a Vercel Blob store and BLOB_READ_WRITE_TOKEN before uploading supplier documents.",
    );
  }

  const relativeFolder = path.join(
    "uploads",
    "accounting",
    String(year),
    monthFolder,
  );

  const absoluteFolder = path.join(
    process.cwd(),
    "public",
    relativeFolder,
  );

  await mkdir(absoluteFolder, { recursive: true });

  const localAbsolutePath = path.join(
    absoluteFolder,
    storedFileName,
  );

  await writeFile(
    localAbsolutePath,
    Buffer.from(await file.arrayBuffer()),
  );

  return {
    originalFileName,
    storedFileName,
    storagePath: `/${relativeFolder.split(path.sep).join("/")}/${storedFileName}`,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    localAbsolutePath,
  };
}

export async function deleteFinanceFile(storagePath: string) {
  if (/^https:\/\//i.test(storagePath)) {
    if (!blobStorageEnabled()) {
      console.warn(
        "Unable to delete Blob file because BLOB_READ_WRITE_TOKEN is not configured.",
      );
      return;
    }

    await del(storagePath);
    return;
  }

  if (!storagePath.startsWith("/uploads/accounting/")) {
    return;
  }

  const relativePath = storagePath.replace(/^\/+/, "");
  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(publicRoot, relativePath);
  const accountingRoot = path.resolve(
    process.cwd(),
    "public",
    "uploads",
    "accounting",
  );
  const relativeToRoot = path.relative(accountingRoot, absolutePath);

  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    return;
  }

  await unlink(absolutePath).catch(() => undefined);
}

export async function readFinanceFile(storagePath: string) {
  if (/^https:\/\//i.test(storagePath)) {
    const response = await fetch(storagePath, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(
        `Unable to read stored accounting file (${response.status}).`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  return null;
}
