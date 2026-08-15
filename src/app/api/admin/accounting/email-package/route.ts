import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildAccountingPackage } from "@/lib/accounting/buildAccountingPackage";

export const runtime = "nodejs";

const MAX_TOTAL_ATTACHMENT_SIZE =
  20 * 1024 * 1024;

type RequestBody = {
  year: number;
  month: number;
  recipients: string[];
  subject: string;
  message: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function monthName(month: number) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      month: "long",
    }
  ).format(
    new Date(
      Date.UTC(
        2026,
        month - 1,
        1
      )
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const year =
      Number(body.year);

    const month =
      Number(body.month);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting period.",
        },
        {
          status: 400,
        }
      );
    }

    const recipients = Array.from(
      new Set(
        (body.recipients ?? [])
          .map((email) =>
            email
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    );

    if (
      recipients.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "At least one recipient email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      recipients.length > 4
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A maximum of four recipients is allowed.",
        },
        {
          status: 400,
        }
      );
    }

    const invalidRecipient =
      recipients.find(
        (email) =>
          !isValidEmail(email)
      );

    if (invalidRecipient) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Invalid email address: ${invalidRecipient}`,
        },
        {
          status: 400,
        }
      );
    }

    const subject =
      body.subject?.trim();

    const message =
      body.message?.trim();

    if (!subject) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email subject is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email message is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Generate the same ZIP packages
     * used by the download feature.
     *
     * strict=true prevents us from
     * emailing an incomplete package.
     */

    let part1:
      Awaited<
        ReturnType<
          typeof buildAccountingPackage
        >
      > | null = null;

    let part2:
      Awaited<
        ReturnType<
          typeof buildAccountingPackage
        >
      > | null = null;

    try {
      part1 =
        await buildAccountingPackage({
          year,
          month,
          part: 1,
          strict: true,
        });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "";

      if (
        !errorMessage.includes(
          "has no documents"
        )
      ) {
        throw error;
      }
    }

    try {
      part2 =
        await buildAccountingPackage({
          year,
          month,
          part: 2,
          strict: true,
        });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "";

      if (
        !errorMessage.includes(
          "has no documents"
        )
      ) {
        throw error;
      }
    }

    if (!part1 && !part2) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "There are no accounting documents to send for this period.",
        },
        {
          status: 400,
        }
      );
    }

    const attachments = [
      part1
        ? {
            filename:
              part1.fileName,
            content:
              part1.buffer,
          }
        : null,

      part2
        ? {
            filename:
              part2.fileName,
            content:
              part2.buffer,
          }
        : null,
    ].filter(
      (
        attachment
      ): attachment is {
        filename: string;
        content: Buffer;
      } =>
        attachment !== null
    );

    const totalAttachmentSize =
      attachments.reduce(
        (total, attachment) =>
          total +
          attachment.content.length,
        0
      );

    if (
      totalAttachmentSize >
      MAX_TOTAL_ATTACHMENT_SIZE
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The accounting package is too large to send by email. Please download the ZIP files and send them separately.",
        },
        {
          status: 413,
        }
      );
    }

    const safeMessage =
      escapeHtml(
        message
      ).replaceAll(
        "\n",
        "<br />"
      );

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
        <div style="max-width:680px;margin:0 auto;">
          <div style="background:#0B1F3A;color:#ffffff;padding:20px 24px;">
            <h2 style="margin:0;font-size:20px;">
              Epoch Journeys OOD
            </h2>
            <p style="margin:6px 0 0;color:#dbe4ee;">
              Monthly Accounting Documents
            </p>
          </div>

          <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;">
            <p style="margin-top:0;">
              ${safeMessage}
            </p>

            <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;">
              <strong>
                Accounting period:
              </strong>
              ${monthName(month)} ${year}
              <br />

              <strong>
                Attachments:
              </strong>
              ${attachments.length} ZIP ${
                attachments.length === 1
                  ? "package"
                  : "packages"
              }
            </div>

            <p style="margin-top:24px;color:#64748b;font-size:12px;">
              Sent from the Epoch Journeys OOD accounting administration system.
            </p>
          </div>
        </div>
      </div>
    `;

    const emailResult =
      await sendEmail({
        to: recipients,
        subject,
        html,
        attachments,
      });

    if (!emailResult) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The accounting email could not be sent.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Only mark the month submitted
     * after the email provider accepts
     * the message.
     */

    await db.accountingPeriod.update({
      where: {
        year_month: {
          year,
          month,
        },
      },

      data: {
        status: "SUBMITTED",
        submittedAt:
          new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Accounting package sent successfully.",
      recipientCount:
        recipients.length,
      attachmentCount:
        attachments.length,
    });
  } catch (error) {
    console.error(
      "POST accounting email package error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to send accounting package.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}