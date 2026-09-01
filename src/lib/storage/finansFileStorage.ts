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

function blobStorageEnabled() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim(),
  );
}

function isActualVercelDeployment() {
  /*
   * Do not use process.env.VERCEL alone.
   *
   * In this project it is proving unreliable during local
   * development.
   *
   * Actual Vercel deployments normally expose deployment-specific
   * values such as VERCEL_URL or VERCEL_REGION.
   */
  return Boolean(
    process.env.VERCEL_URL ||
      process.env.VERCEL_REGION,
  );
}

export async function saveFinanceFile({
  file,
  year,
  month,
  safeFileName,
}: SaveFinanceFileInput): Promise<SavedFinanceFile> {
  const originalFileName =
    file.name || safeFileName;

  const storedFileName =
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const monthFolder =
    String(month).padStart(2, "0");

  const blobPath =
    `accounting/${year}/${monthFolder}/${storedFileName}`;

  /*
   * ============================================================
   * VERCEL BLOB
   * ============================================================
   *
   * If Blob is configured, use it regardless of environment.
   */

  if (blobStorageEnabled()) {
    const blob = await put(
      blobPath,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        contentType:
          file.type ||
          "application/octet-stream",
      },
    );

    return {
      originalFileName,
      storedFileName,
      storagePath: blob.url,
      mimeType:
        file.type ||
        "application/octet-stream",
      fileSize: file.size,
      localAbsolutePath: null,
    };
  }

  /*
   * ============================================================
   * ACTUAL VERCEL DEPLOYMENT WITHOUT BLOB
   * ============================================================
   *
   * Vercel's deployed filesystem is read-only.
   */

  if (isActualVercelDeployment()) {
    throw new Error(
      "File storage is not configured for this Vercel deployment. Add a Vercel Blob store and BLOB_READ_WRITE_TOKEN before uploading finance documents.",
    );
  }

  /*
   * ============================================================
   * LOCAL DEVELOPMENT / LOCAL SERVER
   * ============================================================
   *
   * Save files into:
   *
   * public/uploads/accounting/YYYY/MM/
   */

  const relativeFolder =
    path.join(
      "uploads",
      "accounting",
      String(year),
      monthFolder,
    );

  const absoluteFolder =
    path.join(
      process.cwd(),
      "public",
      relativeFolder,
    );

  await mkdir(
    absoluteFolder,
    {
      recursive: true,
    },
  );

  const localAbsolutePath =
    path.join(
      absoluteFolder,
      storedFileName,
    );

  await writeFile(
    localAbsolutePath,
    Buffer.from(
      await file.arrayBuffer(),
    ),
  );

  const publicPath =
    `/${relativeFolder
      .split(path.sep)
      .join("/")}/${storedFileName}`;

  return {
    originalFileName,
    storedFileName,
    storagePath: publicPath,
    mimeType:
      file.type ||
      "application/octet-stream",
    fileSize: file.size,
    localAbsolutePath,
  };
}

export async function deleteFinanceFile(
  storagePath: string,
) {
  /*
   * ============================================================
   * VERCEL BLOB FILE
   * ============================================================
   */

  if (
    /^https:\/\//i.test(
      storagePath,
    )
  ) {
    if (!blobStorageEnabled()) {
      console.warn(
        "Unable to delete Blob file because BLOB_READ_WRITE_TOKEN is not configured.",
      );

      return;
    }

    await del(storagePath);

    return;
  }

  /*
   * ============================================================
   * LOCAL ACCOUNTING FILE
   * ============================================================
   */

  if (
    !storagePath.startsWith(
      "/uploads/accounting/",
    )
  ) {
    return;
  }

  const relativePath =
    storagePath.replace(
      /^\/+/,
      "",
    );

  const publicRoot =
    path.resolve(
      process.cwd(),
      "public",
    );

  const absolutePath =
    path.resolve(
      publicRoot,
      relativePath,
    );

  const accountingRoot =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
    );

  const relativeToRoot =
    path.relative(
      accountingRoot,
      absolutePath,
    );

  if (
    relativeToRoot.startsWith(
      "..",
    ) ||
    path.isAbsolute(
      relativeToRoot,
    )
  ) {
    return;
  }

  await unlink(
    absolutePath,
  ).catch(
    () => undefined,
  );
}

export async function readFinanceFile(
  storagePath: string,
) {
  /*
   * ============================================================
   * VERCEL BLOB FILE
   * ============================================================
   */

  if (
    /^https:\/\//i.test(
      storagePath,
    )
  ) {
    const response =
      await fetch(
        storagePath,
        {
          cache: "no-store",
        },
      );

    if (!response.ok) {
      throw new Error(
        `Unable to read stored accounting file (${response.status}).`,
      );
    }

    return Buffer.from(
      await response.arrayBuffer(),
    );
  }

  /*
   * Local files under /public are served directly by Next.js.
   */
  return null;
}