import crypto from "crypto";
import { existsSync } from "fs";
import { mkdir, rename, unlink, writeFile } from "fs/promises";
import path from "path";

import { ResourceAudience } from "@prisma/client";

export const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024;

export const ALLOWED_RESOURCE_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
]);

function safeBaseName(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.slice(0, 100) || "resource";
}

function audienceFolder(audience: ResourceAudience) {
  return audience === ResourceAudience.AGENT ? "agent" : "admin";
}

export function resolveResourceDiskPath(storagePath: string) {
  const normalized = storagePath.replaceAll("\\", "/");

  if (normalized.startsWith("storage/resources/")) {
    const storageRoot = path.resolve(process.cwd(), "storage", "resources");
    const absolutePath = path.resolve(process.cwd(), normalized);
    const relative = path.relative(storageRoot, absolutePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return null;
    }

    return absolutePath;
  }

  if (normalized.startsWith("/uploads/resources/")) {
    const publicRoot = path.resolve(process.cwd(), "public", "uploads", "resources");
    const relativePath = normalized.replace(/^\/+/, "");
    const absolutePath = path.resolve(process.cwd(), "public", relativePath);
    const relative = path.relative(publicRoot, absolutePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return null;
    }

    return absolutePath;
  }

  return null;
}

export async function saveResourceFile(file: File, audience: ResourceAudience) {
  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    throw new Error("File is too large. Maximum size is 25 MB.");
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!ALLOWED_RESOURCE_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed.");
  }

  const originalBase = path.basename(file.name, extension);
  const storedFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName(originalBase)}${extension}`;
  const folder = audienceFolder(audience);
  const relativeStoragePath = path.posix.join("storage", "resources", folder, storedFileName);
  const diskFolder = path.join(process.cwd(), "storage", "resources", folder);
  const diskPath = path.join(diskFolder, storedFileName);

  await mkdir(diskFolder, { recursive: true });
  await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

  return {
    originalFileName: file.name,
    storedFileName,
    storagePath: relativeStoragePath,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    diskPath,
  };
}

export async function deleteResourceFile(storagePath: string) {
  const diskPath = resolveResourceDiskPath(storagePath);

  if (!diskPath) return;

  await unlink(diskPath).catch(() => undefined);
}

export async function migrateLegacyResourceFile(
  storagePath: string,
  storedFileName: string,
  audience: ResourceAudience,
) {
  if (!storagePath.startsWith("/uploads/resources/")) {
    return storagePath;
  }

  const oldDiskPath = resolveResourceDiskPath(storagePath);

  if (!oldDiskPath || !existsSync(oldDiskPath)) {
    return storagePath;
  }

  const folder = audienceFolder(audience);
  const newFolder = path.join(process.cwd(), "storage", "resources", folder);
  const newDiskPath = path.join(newFolder, storedFileName);
  const newStoragePath = path.posix.join("storage", "resources", folder, storedFileName);

  await mkdir(newFolder, { recursive: true });
  await rename(oldDiskPath, newDiskPath);

  return newStoragePath;
}
