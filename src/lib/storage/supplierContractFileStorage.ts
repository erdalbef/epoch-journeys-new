import crypto from "node:crypto";
import {
  mkdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  del,
  get,
  put,
} from "@vercel/blob";

type SaveSupplierContractFileInput = {
  file: File;
  supplierId: string;
  safeFileName: string;
};

export type SavedSupplierContractFile = {
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  localAbsolutePath: string | null;
};

function blobStorageEnabled() {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
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

function cleanSupplierId(
  supplierId: string,
) {
  return supplierId
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    )
    .slice(
      0,
      100,
    );
}

export async function saveSupplierContractFile({
  file,
  supplierId,
  safeFileName,
}: SaveSupplierContractFileInput): Promise<SavedSupplierContractFile> {
  const originalFileName =
    file.name ||
    safeFileName;

  const storedFileName =
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const safeSupplierId =
    cleanSupplierId(
      supplierId,
    );

  if (!safeSupplierId) {
    throw new Error(
      "Invalid supplier ID for contract storage.",
    );
  }

  /*
   * ============================================================
   * PRIVATE VERCEL BLOB
   * ============================================================
   *
   * Supplier contracts may contain confidential commercial
   * conditions, negotiated rates, signatures and payment terms.
   *
   * Therefore they use PRIVATE Blob storage.
   * ============================================================
   */

  if (
    blobStorageEnabled()
  ) {
    const blobPath =
      `supplier-contracts/${safeSupplierId}/${storedFileName}`;

    const blob =
      await put(
        blobPath,
        file,
        {
          access:
            "private",

          addRandomSuffix:
            false,

          contentType:
            file.type ||
            "application/octet-stream",
        },
      );

    return {
      originalFileName,

      storedFileName,

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
   * VERCEL WITHOUT BLOB
   * ============================================================
   *
   * Never write into /var/task/public.
   * ============================================================
   */

  if (
    isActualVercelDeployment()
  ) {
    throw new Error(
      "Private supplier contract storage is not configured for this Vercel deployment. Check the connected Blob store and Vercel Blob authentication.",
    );
  }

  /*
   * ============================================================
   * LOCAL DEVELOPMENT FALLBACK
   * ============================================================
   *
   * Local only:
   *
   * public/uploads/supplier-contracts/{supplierId}/
   * ============================================================
   */

  const relativeFolder =
    path.join(
      "uploads",
      "supplier-contracts",
      safeSupplierId,
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
      recursive:
        true,
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
      .split(
        path.sep,
      )
      .join(
        "/",
      )}/${storedFileName}`;

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

export async function deleteSupplierContractFile(
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
        "Unable to delete supplier contract Blob because Vercel Blob authentication is not configured.",
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
   * LOCAL DEVELOPMENT FILE
   * ============================================================
   */

  if (
    !storagePath.startsWith(
      "/uploads/supplier-contracts/",
    )
  ) {
    return;
  }

  const relativePath =
    storagePath.replace(
      /^\/+/,
      "",
    );

  const supplierContractsRoot =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "supplier-contracts",
    );

  const absolutePath =
    path.resolve(
      process.cwd(),
      "public",
      relativePath,
    );

  const relativeToRoot =
    path.relative(
      supplierContractsRoot,
      absolutePath,
    );

  /*
   * Security:
   * Never allow deletion outside
   * public/uploads/supplier-contracts.
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
    () =>
      undefined,
  );
}

export async function readSupplierContractFile(
  storagePath: string,
) {
  /*
   * ============================================================
   * PRIVATE VERCEL BLOB
   * ============================================================
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
        "Unable to read private supplier contract because Vercel Blob authentication is not configured.",
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
        "Unable to read the private supplier contract.",
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
   * LEGACY / PUBLIC HTTP FILE
   * ============================================================
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
        `Unable to read stored supplier contract (${response.status}).`,
      );
    }

    return Buffer.from(
      await response.arrayBuffer(),
    );
  }

  /*
   * Local development files are handled by the protected
   * download route using their /public location.
   */

  return null;
}