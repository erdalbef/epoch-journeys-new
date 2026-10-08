import {
  Role,
  SupplierContractPaymentType,
  SupplierContractStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "node:path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  deleteSupplierContractFile,
  saveSupplierContractFile,
} from "@/lib/storage/supplierContractFileStorage";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    ".pdf",
    ".doc",
    ".docx",
  ]);

const ALLOWED_MIME_TYPES =
  new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);

function text(
  value: FormDataEntryValue | null,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function optionalDate(
  value: FormDataEntryValue | null,
) {
  const raw =
    text(value);

  if (!raw) {
    return null;
  }

  const parsed =
    new Date(
      `${raw}T00:00:00`,
    );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? null
    : parsed;
}

function optionalNumber(
  value: FormDataEntryValue | null,
) {
  const raw =
    text(value);

  if (!raw) {
    return null;
  }

  const parsed =
    Number(raw);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function optionalInteger(
  value: FormDataEntryValue | null,
) {
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
  value: FormDataEntryValue | null,
) {
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
  value: FormDataEntryValue | null,
) {
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
  value: FormDataEntryValue | null,
) {
  const raw =
    text(value);

  if (
    raw === "true"
  ) {
    return true;
  }

  if (
    raw === "false"
  ) {
    return false;
  }

  return null;
}

type PaymentScheduleInput = {
  label?: unknown;
  paymentType?: unknown;
  dueDate?: unknown;
  amount?: unknown;
  percent?: unknown;
  warningDays?: unknown;
  notes?: unknown;
  sortOrder?: unknown;
};

function parsePaymentSchedule(
  raw: string | null,
) {
  if (!raw) {
    return {
      items: [],
      error: null,
    };
  }

  let rows: unknown;

  try {
    rows =
      JSON.parse(raw);
  } catch {
    return {
      items: [],
      error:
        "Payment schedule is not valid JSON.",
    };
  }

  if (!Array.isArray(rows)) {
    return {
      items: [],
      error:
        "Payment schedule must be a list.",
    };
  }

  const items: {
    label: string;
    paymentType: SupplierContractPaymentType;
    dueDate: Date;
    amount: number | null;
    percent: number | null;
    warningDays: number;
    notes: string | null;
    sortOrder: number;
  }[] = [];

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    const row =
      rows[index] as
        PaymentScheduleInput;

    const label =
      typeof row?.label ===
        "string"
        ? row.label.trim()
        : "";

    if (!label) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} requires a label.`,
      };
    }

    const rawType =
      typeof row.paymentType ===
        "string"
        ? row.paymentType.trim()
        : "";

    if (
      !Object.values(
        SupplierContractPaymentType,
      ).includes(
        rawType as SupplierContractPaymentType,
      )
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} has an invalid payment type.`,
      };
    }

    const rawDueDate =
      typeof row.dueDate ===
        "string"
        ? row.dueDate.trim()
        : "";

    const dueDate =
      rawDueDate
        ? new Date(
            `${rawDueDate}T00:00:00`,
          )
        : null;

    if (
      !dueDate ||
      Number.isNaN(
        dueDate.getTime(),
      )
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} requires a valid due date.`,
      };
    }

    const numberOrNull = (
      value: unknown,
    ) => {
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
    };

    const amount =
      numberOrNull(
        row.amount,
      );

    const percent =
      numberOrNull(
        row.percent,
      );

    if (
      amount !== null &&
      amount < 0
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} amount cannot be negative.`,
      };
    }

    if (
      percent !== null &&
      (
        percent < 0 ||
        percent > 100
      )
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} percentage must be between 0 and 100.`,
      };
    }

    const parsedWarning =
      numberOrNull(
        row.warningDays,
      );

    const warningDays =
      parsedWarning ??
      14;

    if (
      !Number.isInteger(
        warningDays,
      ) ||
      warningDays < 0
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} warning days must be a non-negative whole number.`,
      };
    }

    const parsedSort =
      numberOrNull(
        row.sortOrder,
      );

    const sortOrder =
      parsedSort ??
      index;

    if (
      !Number.isInteger(
        sortOrder,
      ) ||
      sortOrder < 0
    ) {
      return {
        items: [],
        error:
          `Payment row ${index + 1} sort order must be a non-negative whole number.`,
      };
    }

    items.push({
      label,
      paymentType:
        rawType as SupplierContractPaymentType,
      dueDate,
      amount,
      percent,
      warningDays,
      notes:
        typeof row.notes ===
          "string" &&
        row.notes.trim()
          ? row.notes.trim()
          : null,
      sortOrder,
    });
  }

  return {
    items,
    error: null,
  };
}

function safeFileName(
  value: string,
) {
  const extension =
    path.extname(
      value,
    );

  const base =
    path.basename(
      value,
      extension,
    );

  const safeBase =
    base
      .normalize(
        "NFKD",
      )
      .replace(
        /\s+/g,
        "-",
      )
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "",
      )
      .replace(
        /-+/g,
        "-",
      )
      .slice(
        0,
        140,
      ) ||
    "supplier-contract";

  return `${safeBase}${extension.toLowerCase()}`;
}

export async function POST(
  request: Request,
  context: Context,
) {
  let uploadedStoragePath:
    | string
    | null =
    null;

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

    const formData =
      await request.formData();

    const uploaded =
      formData.get(
        "file",
      );

    if (
      !(
        uploaded instanceof
        File
      ) ||
      uploaded.size <=
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Select a contract file.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      uploaded.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Contract file must be smaller than 20 MB.",
        },
        {
          status: 400,
        },
      );
    }

    const extension =
      path.extname(
        uploaded.name,
      ).toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(
        extension,
      ) ||
      (
        uploaded.type &&
        !ALLOWED_MIME_TYPES.has(
          uploaded.type,
        )
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF, DOC and DOCX contract files are allowed.",
        },
        {
          status: 400,
        },
      );
    }

    const title =
      text(
        formData.get(
          "title",
        ),
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
        formData.get(
          "status",
        ),
      );

    const status =
      rawStatus &&
      Object.values(
        SupplierContractStatus,
      ).includes(
        rawStatus as SupplierContractStatus,
      )
        ? (
            rawStatus as SupplierContractStatus
          )
        : SupplierContractStatus.ACTIVE;

    const validFrom =
      optionalDate(
        formData.get(
          "validFrom",
        ),
      );

    const validTo =
      optionalDate(
        formData.get(
          "validTo",
        ),
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
        formData.get(
          "depositPercent",
        ),
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

    const paymentScheduleResult =
      parsePaymentSchedule(
        text(
          formData.get(
            "paymentSchedule",
          ),
        ),
      );

    if (
      paymentScheduleResult.error
    ) {
      return NextResponse.json(
        {
          error:
            paymentScheduleResult.error,
        },
        {
          status: 400,
        },
      );
    }

    const paymentSchedule =
      paymentScheduleResult.items;

    const previousVersionId =
      text(
        formData.get(
          "previousVersionId",
        ),
      );

    let version =
      optionalNonNegativeInteger(
        formData.get(
          "version",
        ),
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
          version,
          previous.version +
            1,
        );
    }

    const savedFile =
      await saveSupplierContractFile(
        {
          file:
            uploaded,

          supplierId,

          safeFileName:
            safeFileName(
              uploaded.name,
            ),
        },
      );

    uploadedStoragePath =
      savedFile.storagePath;

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
                      formData.get(
                        "reference",
                      ),
                    ),

                  status,

                  validFrom,

                  validTo,

                  signedDate:
                    optionalDate(
                      formData.get(
                        "signedDate",
                      ),
                    ),

                  renewalNoticeDate:
                    optionalDate(
                      formData.get(
                        "renewalNoticeDate",
                      ),
                    ),

                  lastReviewedAt:
                    optionalDate(
                      formData.get(
                        "lastReviewedAt",
                      ),
                    ),

                  expiryWarningDays:
                    optionalNonNegativeInteger(
                      formData.get(
                        "expiryWarningDays",
                      ),
                    ) ??
                    30,

                  version,

                  previousVersionId,

                  currency:
                    (
                      text(
                        formData.get(
                          "currency",
                        ),
                      ) ||
                      supplier.defaultCurrency ||
                      "EUR"
                    ).toUpperCase(),

                  paymentTerms:
                    text(
                      formData.get(
                        "paymentTerms",
                      ),
                    ),

                  cancellationTerms:
                    text(
                      formData.get(
                        "cancellationTerms",
                      ),
                    ),

                  depositRequired:
                    optionalBoolean(
                      formData.get(
                        "depositRequired",
                      ),
                    ),

                  depositPercent,

                  depositAmount:
                    optionalNonNegativeNumber(
                      formData.get(
                        "depositAmount",
                      ),
                    ),

                  paymentSchedule: {
                    create:
                      paymentSchedule.map(
                        (
                          item,
                        ) => ({
                          label:
                            item.label,

                          paymentType:
                            item.paymentType,

                          dueDate:
                            item.dueDate,

                          amount:
                            item.amount,

                          percent:
                            item.percent,

                          warningDays:
                            item.warningDays,

                          notes:
                            item.notes,

                          sortOrder:
                            item.sortOrder,
                        }),
                      ),
                  },

                  documentUrl:
                    savedFile.storagePath,

                  originalFileName:
                    savedFile.originalFileName,

                  storedFileName:
                    savedFile.storedFileName,

                  mimeType:
                    savedFile.mimeType,

                  fileSize:
                    savedFile.fileSize,

                  notes:
                    text(
                      formData.get(
                        "notes",
                      ),
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

    uploadedStoragePath =
      null;

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
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    if (
      uploadedStoragePath
    ) {
      await deleteSupplierContractFile(
        uploadedStoragePath,
      ).catch(
        () =>
          undefined,
      );
    }

    console.error(
      "SUPPLIER_CONTRACT_UPLOAD_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Could not upload supplier contract.",
      },
      {
        status:
          500,
      },
    );
  }
}
