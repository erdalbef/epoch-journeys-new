import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BookOpen,
  CalendarDays,
  Church,
  Compass,
  Download,
  Hotel,
  Map,
  MapPin,
  Route,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      },
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

function splitParagraphs(
  value: string | null,
) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// ============================================================
// PAGE
// ============================================================

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const session =
    await getServerSession(
      authOptions,
    );

  if (!session?.user?.id) {
    notFound();
  }

  const user =
    await db.user.findUnique({
      where: {
        id:
          session.user.id,
      },

      select: {
        id: true,
        role: true,
        approved: true,
        status: true,
        fullName: true,
        travelAgency: true,
        partnerType: true,
      },
    });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    notFound();
  }

  const tour =
    await db.tour.findFirst({
      where: {
        id,
        isPublished: true,
      },
    });

  if (!tour) {
    notFound();
  }

  const startingPriceText =
    tour.startingPrice !==
    null
      ? formatCurrency(
          tour.startingPrice,
          tour.currency,
        )
      : null;

  const groupSizeText =
    tour.referenceGroupSize
      ? `${tour.referenceGroupSize} paying pilgrims`
      : null;

  const journeyRoute =
    tour.overviewItinerary ||
    tour.destinations.join(
      " • ",
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative">
          {tour.mainImageUrl ? (
            <div className="relative h-[360px] w-full lg:h-[500px]">
              <Image
                src={
                  tour.mainImageUrl
                }
                alt={tour.title}
                fill
                priority
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8 lg:p-10">
                <div className="max-w-4xl">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-200">
                    Epoch Signature
                    Pilgrimage
                  </p>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                    {tour.title}
                  </h1>

                  {tour.subtitle && (
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-100 sm:text-lg">
                      {
                        tour.subtitle
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#001F3F] p-8 text-white lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-200">
                Epoch Signature
                Pilgrimage
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                {tour.title}
              </h1>

              {tour.subtitle && (
                <p className="mt-3 max-w-3xl text-slate-200">
                  {tour.subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* QUICK FACTS */}

        <div className="grid border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <QuickFact
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Duration"
            value={`${tour.duration} days`}
          />

          <QuickFact
            icon={
              <MapPin className="h-5 w-5" />
            }
            label="Destinations"
            value={
              tour.destinations.length >
              0
                ? tour.destinations.join(
                    ", ",
                  )
                : "On request"
            }
          />

          <QuickFact
            icon={
              <Route className="h-5 w-5" />
            }
            label="Journey"
            value={
              tour.arrivalCity &&
              tour.departureCity
                ? `${tour.arrivalCity} → ${tour.departureCity}`
                : "Private group journey"
            }
          />

          <QuickFact
            icon={
              <Church className="h-5 w-5" />
            }
            label="Pilgrimage Style"
            value={
              tour.massIncluded
                ? "Mass where possible"
                : "Faith-based journey"
            }
          />
        </div>
      </section>

      {/* ======================================================
          COMMERCIAL + ACTIONS
      ====================================================== */}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-[#8B0000]" />

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Commercial Reference
            </p>
          </div>

          {startingPriceText ? (
            <>
              <p className="mt-5 text-sm text-slate-500">
                Starting from
              </p>

              <p className="mt-1 text-4xl font-bold text-[#001F3F]">
                {
                  startingPriceText
                }
              </p>

              <p className="mt-1 font-semibold text-[#001F3F]">
                NET per person
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Based on
                double/twin
                occupancy
                {groupSizeText
                  ? ` and ${groupSizeText}`
                  : ""}
                .
              </p>

              {tour.singleSupplementFrom !==
                null && (
                <p className="mt-2 text-sm text-slate-600">
                  Single
                  supplement from{" "}
                  <strong className="text-[#001F3F]">
                    {formatCurrency(
                      tour.singleSupplementFrom,
                      tour.currency,
                    )}
                  </strong>
                </p>
              )}
            </>
          ) : (
            <p className="mt-5 text-xl font-bold text-[#001F3F]">
              Price on request
            </p>
          )}

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            Final NET rate varies
            according to requested
            travel dates, season,
            group size, room
            configuration,
            availability and
            current supplier
            rates.
          </div>
        </div>

        <div className="rounded-2xl bg-[#001F3F] p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">
            Plan This Journey
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Request your group
            quotation
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-200">
            Tell us your preferred
            travel dates, group
            size and room
            requirements. Epoch
            will prepare the
            official NET quotation.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href={`/b2b/custom-requests/new?tourId=${tour.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6f0000]"
            >
              Request Official Quote
            </Link>

            {tour.brochureUrl && (
              <a
                href={
                  tour.brochureUrl
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                <Download className="h-4 w-4" />

                Download Brochure
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================
          OVERVIEW
      ====================================================== */}

      {(tour.overview ||
        tour.shortDescription) && (
        <ContentSection
          eyebrow="Journey Overview"
          title="The pilgrimage at a glance"
          icon={
            <Compass className="h-5 w-5" />
          }
        >
          {tour.overview ? (
            <RichParagraphs
              value={tour.overview}
            />
          ) : (
            <p className="leading-7 text-slate-600">
              {
                tour.shortDescription
              }
            </p>
          )}
        </ContentSection>
      )}

      {/* ======================================================
          INTRODUCTION
      ====================================================== */}

      {tour.tourIntroduction && (
        <ContentSection
          eyebrow="The Story"
          title="The Journey Begins"
          icon={
            <BookOpen className="h-5 w-5" />
          }
        >
          <RichParagraphs
            value={
              tour.tourIntroduction
            }
          />
        </ContentSection>
      )}

      {/* ======================================================
          SIGNIFICANCE
      ====================================================== */}

      {tour.tourSignificance && (
        <ContentSection
          eyebrow="Spiritual Significance"
          title="Why This Journey Matters"
          icon={
            <Church className="h-5 w-5" />
          }
        >
          <RichParagraphs
            value={
              tour.tourSignificance
            }
          />
        </ContentSection>
      )}

      {/* ======================================================
          WHY EPOCH
      ====================================================== */}

      {tour.whyWeOfferThisTour && (
        <section className="rounded-2xl bg-[#001F3F] p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">
            The Epoch Difference
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Why Epoch Offers
            This Journey
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
            {splitParagraphs(
              tour.whyWeOfferThisTour,
            ).map(
              (
                paragraph,
                index,
              ) => (
                <p key={index}>
                  {paragraph}
                </p>
              ),
            )}
          </div>
        </section>
      )}

      {/* ======================================================
          SIGNATURE EXPERIENCES
      ====================================================== */}

      {tour.highlights.length >
        0 && (
        <ContentSection
          eyebrow="Signature Experiences"
          title="What pilgrims will remember"
          icon={
            <Sparkles className="h-5 w-5" />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {tour.highlights.map(
              (
                highlight,
                index,
              ) => (
                <div
                  key={`${highlight}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#8B0000]" />

                    <p className="text-sm leading-6 text-slate-700">
                      {highlight}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </ContentSection>
      )}

      {/* ======================================================
          AT A GLANCE
      ====================================================== */}

      <ContentSection
        eyebrow="Journey Design"
        title="Journey at a Glance"
        icon={
          <Route className="h-5 w-5" />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            label="Hotel Standard"
            value={
              tour.hotelStandard ||
              "Carefully selected hotels"
            }
          />

          <DetailCard
            label="Meal Plan"
            value={
              tour.mealPlan ||
              "As specified in itinerary"
            }
          />

          <DetailCard
            label="Walking Level"
            value={
              tour.walkingLevel ||
              "Varies by journey"
            }
          />

          <DetailCard
            label="Journey Pace"
            value={
              tour.pace ||
              "Balanced"
            }
          />

          <DetailCard
            label="Arrival"
            value={
              tour.arrivalCity ||
              "To be confirmed"
            }
          />

          <DetailCard
            label="Departure"
            value={
              tour.departureCity ||
              "To be confirmed"
            }
          />
        </div>

        {tour.transportationSummary && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Transportation
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {
                tour.transportationSummary
              }
            </p>
          </div>
        )}

        {journeyRoute && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Map className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                  Journey Route
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {
                    journeyRoute
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </ContentSection>

      {/* ======================================================
          IDEAL FOR / SELLING POINTS
      ====================================================== */}

      {(tour.idealFor.length >
        0 ||
        tour.agentSellingPoints
          .length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {tour.idealFor.length >
            0 && (
            <ContentSection
              eyebrow="Best Audience"
              title="Ideal For"
              icon={
                <Users className="h-5 w-5" />
              }
            >
              <div className="flex flex-wrap gap-2">
                {tour.idealFor.map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </ContentSection>
          )}

          {tour
            .agentSellingPoints
            .length > 0 && (
            <ContentSection
              eyebrow="Advisor Toolkit"
              title="Key Selling Points"
              icon={
                <Sparkles className="h-5 w-5" />
              }
            >
              <ul className="space-y-3">
                {tour.agentSellingPoints.map(
                  (item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-6 text-slate-700"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#8B0000]" />

                      {item}
                    </li>
                  ),
                )}
              </ul>
            </ContentSection>
          )}
        </section>
      )}

      {/* ======================================================
          DESTINATION CONTEXT
      ====================================================== */}

      {tour.destinationBriefs && (
        <ContentSection
          eyebrow="Destination Context"
          title="Places with Meaning"
          icon={
            <MapPin className="h-5 w-5" />
          }
        >
          <RichParagraphs
            value={
              tour.destinationBriefs
            }
          />
        </ContentSection>
      )}

      {/* ======================================================
          INCLUSIONS / EXCLUSIONS
      ====================================================== */}

      {(tour.inclusions.length >
        0 ||
        tour.exclusions.length >
          0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {tour.inclusions.length >
            0 && (
            <ListSection
              title="What's Included"
              items={
                tour.inclusions
              }
              positive
            />
          )}

          {tour.exclusions.length >
            0 && (
            <ListSection
              title="What's Not Included"
              items={
                tour.exclusions
              }
            />
          )}
        </section>
      )}

      {/* ======================================================
          EPOCH STANDARD
      ====================================================== */}

      {tour.accommodations.length >
        0 && (
        <ContentSection
          eyebrow="The Epoch Standard"
          title="Accommodation & Journey Standards"
          icon={
            <Hotel className="h-5 w-5" />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {tour.accommodations.map(
              (
                item,
                index,
              ) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700"
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </ContentSection>
      )}

      {/* ======================================================
          MAP
      ====================================================== */}

      {tour.mapImageUrl && (
        <ContentSection
          eyebrow="Route"
          title="Journey Map"
          icon={
            <Map className="h-5 w-5" />
          }
        >
          <div className="relative h-[320px] overflow-hidden rounded-2xl border border-slate-200 sm:h-[430px]">
            <Image
              src={
                tour.mapImageUrl
              }
              alt={`${tour.title} journey map`}
              fill
              className="object-contain"
            />
          </div>
        </ContentSection>
      )}

      {/* ======================================================
          BOTTOM CTA
      ====================================================== */}

      <section className="rounded-3xl bg-[#001F3F] p-6 text-white sm:p-8 lg:flex lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">
            Ready to Plan
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Build this pilgrimage
            around your group
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-200">
            Send us the preferred
            dates, estimated group
            size and room
            requirements. We will
            prepare the official NET
            quotation.
          </p>
        </div>

        <Link
          href={`/b2b/custom-requests/new?tourId=${tour.id}`}
          className="mt-6 inline-flex rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6f0000] lg:mt-0"
        >
          Request Official Quote
        </Link>
      </section>
    </div>
  );
}

// ============================================================
// UI COMPONENTS
// ============================================================

function QuickFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-slate-100 p-5 sm:border-r">
      <div className="flex gap-3">
        <div className="text-[#8B0000]">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#001F3F]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ContentSection({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex gap-3">
        <div className="mt-1 text-[#8B0000]">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-2xl font-bold text-[#001F3F]">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function RichParagraphs({
  value,
}: {
  value: string;
}) {
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
      {splitParagraphs(
        value,
      ).map(
        (
          paragraph,
          index,
        ) => (
          <p key={index}>
            {paragraph}
          </p>
        ),
      )}
    </div>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-[#001F3F]">
        {value}
      </p>
    </div>
  );
}

function ListSection({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#001F3F]">
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {items.map(
          (
            item,
            index,
          ) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-3 text-sm leading-6 text-slate-700"
            >
              <span
                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                  positive
                    ? "bg-emerald-600"
                    : "bg-[#8B0000]"
                }`}
              />

              {item}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}