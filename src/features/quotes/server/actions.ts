"use server";

import { revalidatePath } from "next/cache";
import { Prisma, QuotePurpose, QuoteStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { calculateQuote } from "@/lib/quotes/calculateQuote";
import { toQuoteInput } from "../toQuoteInput";
import type { FormState } from "../types";

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function saveQuoteAction(input: {
  quoteId?: string;
  title?: string;
  recipientName?: string;
  recipientEmail?: string;
  templateId?: string | null;
  form: FormState;
}) {
  const quoteInput = toQuoteInput(input.form);
  const result = calculateQuote(quoteInput);

  const data = {
    title: input.title?.trim() || null,
    recipientName: input.recipientName?.trim() || null,
    recipientEmail: input.recipientEmail?.trim() || null,
    templateId: input.templateId ?? null,

    quoteBuilderPayload: toJsonValue(input.form),
    quoteBuilderSummary: toJsonValue(result),
    calculationVersion: "v1",

    subtotal: result.totals.totalTourCost ?? 0,
    totalAmount: result.totals.totalTourCost ?? 0,
    currency: "EUR",
  };

  const quote = input.quoteId
    ? await db.quote.update({
        where: { id: input.quoteId },
        data,
      })
    : await db.quote.create({
        data: {
          ...data,
          purpose: QuotePurpose.CUSTOM_REQUEST,
          status: QuoteStatus.DRAFT,
        },
      });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/quotes/new");

  return { id: quote.id };
}

export async function saveTemplateAction(input: {
  name: string;
  description?: string;
  form: FormState;
  userId?: string;
}) {
  const quoteInput = toQuoteInput(input.form);
  const result = calculateQuote(quoteInput);

  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new Error("Template name is required.");
  }

  const template = await db.quoteTemplate.create({
    data: {
      title: trimmedName,
      name: trimmedName,
      description: input.description?.trim() || null,
      createdById: input.userId ?? null,

      payload: toJsonValue(input.form),
      summary: toJsonValue(result),
      calculationVersion: "v1",
      currency: "EUR",
    },
  });

  revalidatePath("/admin/quotes/templates");

  return { id: template.id };
}

export async function loadTemplateAction(templateId: string) {
  const template = await db.quoteTemplate.findUnique({
    where: { id: templateId },
    select: {
      payload: true,
    },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  return template.payload as unknown as FormState;
}

export async function listTemplatesAction() {
  return db.quoteTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  });
}