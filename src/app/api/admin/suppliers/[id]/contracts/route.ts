import {
  Role,
  SupplierContractStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function text(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function optionalDate(
  value: unknown,
): Date | null {
  const parsedText =
    text(value);

  if (!parsedText) {
    return null;
  }

  const parsed =
    new Date(
      `${parsedText}T00:00:00`,
    );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

function optionalNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function optionalInteger(
  value: unknown,
): number | null {
  const parsed =
    optionalNumber(
      value,
    );

  if (
    parsed === null ||
    !Number.isInteger(
      parsed,
    )
  ) {
    return null;
  }

  return parsed;
}

function optionalNonNegativeInteger(
  value: unknown,
): number | null {
  const parsed =
    optionalInteger(
      value,
    );

  if (
    parsed === null ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function optionalNonNegativeNumber(
  value: unknown,
): number | null {
  const parsed =
    optionalNumber(
      value,
    );

  if (
    parsed === null ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function optionalBoolean(
  value: unknown,
): boolean | null {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    value === "true"
  ) {
    return true;
  }

  if (
    value === "false"
  ) {
    return false;
  }

  return null;
}

export async function POST(
  request: Request,
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
    } =
      await context.params;

    const supplier =
      await db.supplier.findUnique(
        {
          where: {
            id:
              supplierId,
          },

          select: {
            id:
              true,

            defaultCurrency:
              true,
          },
        },
      );

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Supplier not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const title =
      text(
        body.title,
      );

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Contract title is required.",
        },
        {
          status: 400,
        },
      );
    }

    const rawStatus =
      text(
        body.status,
      );

    const status =
      rawStatus &&
      Object.values(
        SupplierContractStatus,
      ).includes(
        rawStatus as SupplierContractStatus,
      )
        ? (rawStatus as SupplierContractStatus)
        : SupplierContractStatus.ACTIVE;

    const validFrom =
      optionalDate(
        body.validFrom,
      );

    const validTo =
      optionalDate(
        body.validTo,
      );

    if (
      validFrom &&
      validTo &&
      validTo <
        validFrom
    ) {
      return NextResponse.json(
        {
          error:
            "Valid To cannot be earlier than Valid From.",
        },
        {
          status: 400,
        },
      );
    }

    const depositPercent =
      optionalNonNegativeNumber(
        body.depositPercent,
      );

    if (
      depositPercent !==
        null &&
      depositPercent >
        100
    ) {
      return NextResponse.json(
        {
          error:
            "Deposit percentage cannot exceed 100%.",
        },
        {
          status: 400,
        },
      );
    }

    const previousVersionId =
      text(
        body.previousVersionId,
      );

    let version =
      optionalNonNegativeInteger(
        body.version,
      ) ??
      1;

    if (
      previousVersionId
    ) {
      const previous =
        await db.supplierContract.findFirst(
          {
            where: {
              id:
                previousVersionId,

              supplierId,
            },

            select: {
              id:
                true,

              version:
                true,

              status:
                true,
            },
          },
        );

      if (!previous) {
        return NextResponse.json(
          {
            error:
              "Previous contract version was not found for this supplier.",
          },
          {
            status: 400,
          },
        );
      }

      version =
        Math.max(
          previous.version +
            1,
          version,
        );
    }

    const contract =
      await db.$transaction(
        async (
          tx,
        ) => {
          const created =
            await tx.supplierContract.create(
              {
                data: {
                  supplierId,

                  title,

                  reference:
                    text(
                      body.reference,
                    ),

                  status,

                  validFrom,

                  validTo,

                  signedDate:
                    optionalDate(
                      body.signedDate,
                    ),

                  renewalNoticeDate:
                    optionalDate(
                      body.renewalNoticeDate,
                    ),

                  lastReviewedAt:
                    optionalDate(
                      body.lastReviewedAt,
                    ),

                  expiryWarningDays:
                    optionalNonNegativeInteger(
                      body.expiryWarningDays,
                    ) ??
                    30,

                  version,

                  previousVersionId,

                  currency:
                    (
                      text(
                        body.currency,
                      ) ||
                      supplier.defaultCurrency ||
                      "EUR"
                    ).toUpperCase(),

                  paymentTerms:
                    text(
                      body.paymentTerms,
                    ),

                  cancellationTerms:
                    text(
                      body.cancellationTerms,
                    ),

                  depositRequired:
                    optionalBoolean(
                      body.depositRequired,
                    ),

                  depositPercent,

                  depositAmount:
                    optionalNonNegativeNumber(
                      body.depositAmount,
                    ),

                  depositDueDaysBeforeArrival:
                    optionalNonNegativeInteger(
                      body.depositDueDaysBeforeArrival,
                    ),

                  balanceDueDaysBeforeArrival:
                    optionalNonNegativeInteger(
                      body.balanceDueDaysBeforeArrival,
                    ),

                  documentUrl:
                    text(
                      body.documentUrl,
                    ),

                  originalFileName:
                    text(
                      body.originalFileName,
                    ),

                  storedFileName:
                    text(
                      body.storedFileName,
                    ),

                  mimeType:
                    text(
                      body.mimeType,
                    ),

                  fileSize:
                    optionalNonNegativeInteger(
                      body.fileSize,
                    ),

                  notes:
                    text(
                      body.notes,
                    ),
                },
              },
            );

          if (
            previousVersionId
          ) {
            await tx.supplierContract.update(
              {
                where: {
                  id:
                    previousVersionId,
                },

                data: {
                  status:
                    SupplierContractStatus.REPLACED,

                  replacedAt:
                    new Date(),
                },
              },
            );
          }

          return created;
        },
      );

    return NextResponse.json(
      {
        success:
          true,

        contract: {
          ...contract,

          depositPercent:
            contract.depositPercent ===
            null
              ? null
              : Number(
                  contract.depositPercent,
                ),

          depositAmount:
            contract.depositAmount ===
            null
              ? null
              : Number(
                  contract.depositAmount,
                ),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "SUPPLIER_CONTRACT_CREATE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save supplier contract.",
      },
      {
        status: 500,
      },
    );
  }
}