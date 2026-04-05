'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

import { calculateQuote } from '@/lib/quotes/calculateQuote'
import { toQuoteInput } from '../toQuoteInput'
import type { FormState } from '../types'

export async function saveQuoteAction(input: {
  quoteId?: string
  title?: string
  recipientName?: string
  recipientEmail?: string
  templateId?: string | null
  form: FormState
}) {
  const quoteInput = toQuoteInput(input.form)
  const result = calculateQuote(quoteInput)

  const data = {
    title: input.title,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    templateId: input.templateId ?? undefined,

    quoteBuilderPayload: input.form as any,
    quoteBuilderSummary: result as any,
    calculationVersion: 'v1',

    subtotal: result.totals.totalTourCost ?? 0,
    totalAmount: result.totals.totalTourCost ?? 0,
    currency: 'EUR',
  }

  const quote = input.quoteId
    ? await prisma.quote.update({
        where: { id: input.quoteId },
        data,
      })
    : await prisma.quote.create({
        data: {
          ...data,
          status: 'DRAFT',
        },
      })

  revalidatePath('/quotes')
  return { id: quote.id }
}

export async function saveTemplateAction(input: {
  name: string
  description?: string
  form: FormState
  userId?: string
}) {
  const quoteInput = toQuoteInput(input.form)
  const result = calculateQuote(quoteInput)

  const template = await prisma.quoteTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      createdById: input.userId,

      payload: input.form as any,
      summary: result as any,
      calculationVersion: 'v1',
      currency: 'EUR',
    },
  })

  revalidatePath('/quotes')
  return { id: template.id }
}

export async function loadTemplateAction(templateId: string) {
  const template = await prisma.quoteTemplate.findUnique({
    where: { id: templateId },
  })

  if (!template) throw new Error('Template not found')

  return template.payload as FormState
}

export async function listTemplatesAction() {
  return prisma.quoteTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  })
}