import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  del,
  get,
  put,
} from "@vercel/blob";

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
  return Boolean(
    process.env.VERCEL_URL ||
      process.env.VERCEL_REGION,
  );
}

function isPrivateBlobUrl(
  storagePath: string,
) {
  try {
    const url =
      new URL(storagePath);

    return (
      url.hostname.endsWith(
        ".private.blob.vercel-storage.com",
      ) ||
      url.hostname ===
        "private.blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

function isHttpUrl(
  storagePath: string,
) {
  return /^https?:\/\//i.test(
    storagePath,
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
    String(month).padStart(
      2,
      "0",
    );

  const blobPath =
    `accounting/${year}/${monthFolder}/${storedFileName}`;

  /*
   * ============================================================
   * VERCEL BLOB
   * ============================================================
   *
   * Epoch Journeys uses a PRIVATE Blob store because these files
   * contain supplier invoices, customer payment proofs, bank
   * confirmations and accounting documents.
   */

  if (blobStorageEnabled()) {
    const blob =
      await put(
        blobPath,
        file,
        {
          access: "private",
          addRandomSuffix: false,
          contentType:
            file.type ||
            "application/octet-stream",
        },
      );

    return {
      originalFileName,
      storedFileName,

      /*
       * Store the private Blob URL in the database.
       *
       * It must not normally be opened directly in the browser.
       * Server download routes should use readFinanceFile().
       */
      storagePath:
        blob.url,

      mimeType:
        file.type ||
        "application/octet-stream",

      fileSize:
        file.size,

      localAbsolutePath:
        null,
    };
  }

  /*
   * ============================================================
   * ACTUAL VERCEL DEPLOYMENT WITHOUT BLOB
   * ============================================================
   *
   * Never attempt to write to /var/task/public on Vercel.
   * That filesystem is read-only.
   */

  if (
    isActualVercelDeployment()
  ) {
    throw new Error(
      "Private finance file storage is not configured for this Vercel deployment. Check the connected Blob store and BLOB_READ_WRITE_TOKEN.",
    );
  }

  /*
   * ============================================================
   * LOCAL DEVELOPMENT STORAGE
   * ============================================================
   *
   * Used only when Blob credentials are not available.
   *
   * Files are stored at:
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
    storagePath:
      publicPath,
    mimeType:
      file.type ||
      "application/octet-stream",
    fileSize:
      file.size,
    localAbsolutePath,
  };
}

export async function deleteFinanceFile(
  storagePath: string,
) {
  /*
   * ============================================================
   * VERCEL BLOB
   * ============================================================
   */

  if (
    isHttpUrl(
      storagePath,
    )
  ) {
    if (
      !blobStorageEnabled()
    ) {
      console.warn(
        "Unable to delete Blob file because BLOB_READ_WRITE_TOKEN is not configured.",
      );

      return;
    }

    await del(
      storagePath,
    );

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

  /*
   * Security:
   * never permit deleting outside
   * public/uploads/accounting.
   */

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
   * PRIVATE VERCEL BLOB
   * ============================================================
   *
   * Private Blob URLs cannot be fetched anonymously.
   *
   * Use the authenticated Blob SDK get() call and return the file
   * contents to our protected server download route.
   */

  if (
    isPrivateBlobUrl(
      storagePath,
    )
  ) {
    if (
      !blobStorageEnabled()
    ) {
      throw new Error(
        "Unable to read private finance document because BLOB_READ_WRITE_TOKEN is not configured.",
      );
    }

    const result =
      await get(
        storagePath,
        {
          access:
            "private",
        },
      );

    if (
      !result ||
      result.statusCode !==
        200 ||
      !result.stream
    ) {
      throw new Error(
        "Unable to read the private accounting file.",
      );
    }

    const arrayBuffer =
      await new Response(
        result.stream,
      ).arrayBuffer();

    return Buffer.from(
      arrayBuffer,
    );
  }

  /*
   * ============================================================
   * LEGACY PUBLIC BLOB
   * ============================================================
   *
   * Keep support for files that may already have been stored in a
   * public Blob store before the switch to private storage.
   */

  if (
    isHttpUrl(
      storagePath,
    )
  ) {
    const response =
      await fetch(
        storagePath,
        {
          cache:
            "no-store",
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Unable to read stored accounting file (${response.status}).`,
      );
    }

    return Buffer.from(
      await response.arrayBuffer(),
    );
  }

  /*
   * Local files under /public can continue to be served directly
   * by Next.js.
   */

  return null;
}