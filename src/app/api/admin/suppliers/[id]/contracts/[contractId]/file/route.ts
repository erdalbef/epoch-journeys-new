import {
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "node:path";
import {
  readFile,
} from "node:fs/promises";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  readSupplierContractFile,
} from "@/lib/storage/supplierContractFileStorage";

type Context = {
  params: Promise<{
    id: string;
    contractId: string;
  }>;
};

function contentDispositionFileName(
  value: string,
) {
  return value
    .replace(
      /[\r\n"]/g,
      "",
    )
    .slice(
      0,
      180,
    );
}

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      id: supplierId,
      contractId,
    } =
      await context.params;

    const contract =
      await db.supplierContract.findFirst(
        {
          where: {
            id:
              contractId,

            supplierId,
          },

          select: {
            id:
              true,

            documentUrl:
              true,

            originalFileName:
              true,

            mimeType:
              true,
          },
        },
      );

    if (!contract) {
      return NextResponse.json(
        {
          error:
            "Supplier contract not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !contract.documentUrl
    ) {
      return NextResponse.json(
        {
          error:
            "No contract document is stored.",
        },
        {
          status: 404,
        },
      );
    }

    let fileBuffer:
      Buffer;

    if (
      /^https?:\/\//i.test(
        contract.documentUrl,
      )
    ) {
      const remoteFile =
        await readSupplierContractFile(
          contract.documentUrl,
        );

      if (!remoteFile) {
        throw new Error(
          "Stored supplier contract could not be read.",
        );
      }

      fileBuffer =
        remoteFile;
    } else {
      /*
       * Local-development fallback.
       *
       * Only permit files under:
       * public/uploads/supplier-contracts/
       */

      if (
        !contract.documentUrl.startsWith(
          "/uploads/supplier-contracts/",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Unsupported contract file path.",
          },
          {
            status: 400,
          },
        );
      }

      const publicRoot =
        path.resolve(
          process.cwd(),
          "public",
        );

      const absolutePath =
        path.resolve(
          publicRoot,
          contract.documentUrl.replace(
            /^\/+/,
            "",
          ),
        );

      const contractsRoot =
        path.resolve(
          process.cwd(),
          "public",
          "uploads",
          "supplier-contracts",
        );

      const relativeToRoot =
        path.relative(
          contractsRoot,
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
        return NextResponse.json(
          {
            error:
              "Invalid contract file path.",
          },
          {
            status: 400,
          },
        );
      }

      fileBuffer =
        await readFile(
          absolutePath,
        );
    }

    const fileName =
      contentDispositionFileName(
        contract.originalFileName ||
          "supplier-contract",
      );

    return new NextResponse(
  new Uint8Array(
    fileBuffer,
  ),
  {
    status: 200,

    headers: {
      "Content-Type":
        contract.mimeType ||
        "application/octet-stream",

      "Content-Disposition":
        `inline; filename="${fileName}"`,

      "Cache-Control":
        "private, no-store, max-age=0",
    },
  },
);

  } catch (error) {
    console.error(
      "SUPPLIER_CONTRACT_FILE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not open supplier contract.",
      },
      {
        status:
          500,
      },
    );
  }
}