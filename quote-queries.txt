import { db } from "@/lib/db";

export async function getToursForQuoteForm() {
  const tours = await db.tour.findMany({
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
      overviewItinerary: true,
      itinerary: true,

      pricingTiers: {
        where: {
          isActive: true,
        },

        select: {
          pricePerPerson: true,
          currency: true,
        },

        orderBy: {
          pricePerPerson: "asc",
        },
      },
    },
  });

  return tours.map((tour) => {
    const referenceTier =
      tour.pricingTiers[0] ?? null;

    return {
      id: tour.id,
      title: tour.title,
      category: tour.category,
      overviewItinerary: tour.overviewItinerary,
      itinerary: tour.itinerary,

      /*
       * Tour no longer stores startingPrice
       * or currency directly.
       *
       * For the Quote form, we derive a
       * reference starting price from the
       * lowest active PricingTier.
       */

      startingPrice:
        referenceTier?.pricePerPerson ?? null,

      currency:
        referenceTier?.currency ?? "EUR",
    };
  });
}

export async function getQuoteById(id: string) {
  return db.quote.findUnique({
    where: {
      id,
    },

    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      activities: {
        orderBy: {
          createdAt: "desc",
        },

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

      template: {
        select: {
          id: true,
          title: true,
          name: true,
        },
      },

      tour: {
        select: {
          id: true,
          title: true,
          category: true,
          subcategories: true,
          tags: true,
          destinations: true,
          duration: true,
          shortDescription: true,
          overview: true,
          overviewItinerary: true,
          itinerary: true,
          brochureUrl: true,
          mainImageUrl: true,
          mapImageUrl: true,
        },
      },

      departureDate: {
        select: {
          id: true,
          date: true,
          price: true,
          status: true,
          season: true,
          earlyDiscountPercent: true,
          earlyDiscountDeadline: true,
        },
      },

      request: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              travelAgency: true,
              phone: true,
              agentCode: true,
            },
          },
        },
      },

      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          status: true,
          paymentStatus: true,
        },
      },

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