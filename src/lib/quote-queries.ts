import { prisma } from "@/lib/prisma";

export async function getToursForQuoteForm() {
  return prisma.tour.findMany({
    where: {
      requiresQuote: true,
    },
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
      category: true,
    },
  });
}

export async function getQuoteById(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      tour: true,
      departureDate: true,
      request: true,
      finalizedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      sentBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}