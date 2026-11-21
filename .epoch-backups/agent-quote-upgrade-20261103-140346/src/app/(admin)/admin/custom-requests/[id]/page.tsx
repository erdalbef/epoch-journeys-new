import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import {
  BedDouble,
  CalendarDays,
  Church,
  CircleDollarSign,
  Compass,
  FileText,
  Languages,
  MapPin,
  Plane,
  Route,
  UserRound,
  Users,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import UpdateRequestForm from "./update-form";

// ============================================================
// TYPES
// ============================================================

type Props = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(
  value: Date | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(value);
}

function formatMoney(
  value: number | null,
  currency: string,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatStatus(
  value: string,
) {
  return value.replaceAll("_", " ");
}

function yesNo(
  value: boolean,
) {
  return value ? "Yes" : "No";
}

// ============================================================
// PAGE
// ============================================================

export default async function AdminCustomRequestDetailPage({
  params,
}: Props) {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const request =
    await db.customTourRequest.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            travelAgency: true,
            partnerType: true,
          },
        },

        tour: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            tourCode: true,
            destinations: true,
            duration: true,
            startingPrice: true,
            currency: true,
            startingPriceBasis: true,
            referenceGroupSize: true,
          },
        },

        selectedQuote: {
          select: {
            id: true,
            quoteReference: true,
            status: true,
            totalAmount: true,
            currency: true,
          },
        },

        quotes: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            quoteReference: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        },
      },
    });

  if (!request) {
    notFound();
  }

  const roomTotal =
    (request.singleRooms ?? 0) +
    (request.doubleRooms ?? 0) +
    (request.twinRooms ?? 0) +
    (request.tripleRooms ?? 0);

  const selectedJourney =
    request.tour;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Pilgrimage Quote Request
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#001F3F]">
              {request.requestReference}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatStatus(
                  request.status,
                )}
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {formatStatus(
                  request.requestType,
                )}
              </span>

              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {formatStatus(
                  request.bookingType,
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/custom-requests"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#001F3F]"
            >
              Back to Requests
            </Link>

            <Link
              href={`/admin/quotes/new?requestId=${request.id}`}
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              Prepare Quote
            </Link>

            <Link
              href={`/admin/bookings/new?requestId=${request.id}`}
              className="rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#001633]"
            >
              Convert to Booking
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================
          SELECTED JOURNEY
      ====================================================== */}

      {selectedJourney ? (
        <section className="overflow-hidden rounded-2xl bg-[#001F3F] text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <Compass className="mt-1 h-5 w-5 text-red-200" />

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">
                  Selected Epoch Journey
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {
                    selectedJourney.title
                  }
                </h2>

                {selectedJourney.subtitle ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                    {
                      selectedJourney.subtitle
                    }
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <JourneyFact
                label="Tour Code"
                value={
                  selectedJourney.tourCode ||
                  "—"
                }
              />

              <JourneyFact
                label="Duration"
                value={`${selectedJourney.duration} days`}
              />

              <JourneyFact
                label="Destinations"
                value={
                  selectedJourney.destinations.join(
                    ", ",
                  ) || "—"
                }
              />

              <JourneyFact
                label="Starting NET"
                value={
                  selectedJourney.startingPrice !==
                  null
                    ? `${formatMoney(
                        selectedJourney.startingPrice,
                        selectedJourney.currency,
                      )} p.p.`
                    : "On request"
                }
              />
            </div>

            {selectedJourney.referenceGroupSize ? (
              <p className="mt-5 text-xs leading-5 text-slate-300">
                Starting reference based on
                double/twin occupancy and{" "}
                {
                  selectedJourney.referenceGroupSize
                }{" "}
                paying pilgrims.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ======================================================
          AGENT + GROUP OVERVIEW
      ====================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoSection
          icon={
            <UserRound className="h-5 w-5" />
          }
          eyebrow="Submitted By"
          title="Agent / Partner"
        >
          <InfoGrid>
            <InfoItem
              label="Agent"
              value={
                request.user.fullName ||
                "—"
              }
            />

            <InfoItem
              label="Travel Agency"
              value={
                request.user
                  .travelAgency || "—"
              }
            />

            <InfoItem
              label="Email"
              value={
                request.user.email ||
                "—"
              }
            />

            <InfoItem
              label="Partner Type"
              value={
                request.user
                  .partnerType
                  ? formatStatus(
                      request.user
                        .partnerType,
                    )
                  : "—"
              }
            />
          </InfoGrid>
        </InfoSection>

        <InfoSection
          icon={
            <Users className="h-5 w-5" />
          }
          eyebrow="Group"
          title="Group Overview"
        >
          <InfoGrid>
            <InfoItem
              label="Group Name"
              value={
                request.groupName ||
                "—"
              }
            />

            <InfoItem
              label="Group Leader"
              value={
                request.groupLeaderName ||
                "—"
              }
            />

            <InfoItem
              label="Estimated Pilgrims"
              value={
                request.estimatedPax?.toString() ||
                "—"
              }
            />

            <InfoItem
              label="Complimentary Places"
              value={String(
                request.complimentaryPlaces ??
                  0,
              )}
            />
          </InfoGrid>
        </InfoSection>
      </section>

      {/* ======================================================
          DATES + DESTINATION
      ====================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoSection
          icon={
            <CalendarDays className="h-5 w-5" />
          }
          eyebrow="Travel Timing"
          title="Requested Dates"
        >
          <InfoGrid>
            <InfoItem
              label="Preferred Start"
              value={formatDate(
                request.startDate,
              )}
            />

            <InfoItem
              label="Alternative Start"
              value={formatDate(
                request.alternativeStartDate,
              )}
            />

            <InfoItem
              label="Preferred End"
              value={formatDate(
                request.endDate,
              )}
            />

            <InfoItem
              label="Flexible Dates"
              value={yesNo(
                request.datesFlexible,
              )}
            />

            <InfoItem
              label="Duration"
              value={
                request.durationDays
                  ? `${request.durationDays} days`
                  : "—"
              }
            />
          </InfoGrid>
        </InfoSection>

        <InfoSection
          icon={
            <MapPin className="h-5 w-5" />
          }
          eyebrow="Route"
          title="Destination"
        >
          <InfoGrid>
            <InfoItem
              label="Main Destination"
              value={
                request.destination ||
                "—"
              }
            />

            <InfoItem
              label="Destinations"
              value={
                request.destinations
                  .length > 0
                  ? request.destinations.join(
                      ", ",
                    )
                  : "—"
              }
            />

            <InfoItem
              label="Requested Title"
              value={
                request.title || "—"
              }
            />
          </InfoGrid>
        </InfoSection>
      </section>

      {/* ======================================================
          ROOMING
      ====================================================== */}

      <InfoSection
        icon={
          <BedDouble className="h-5 w-5" />
        }
        eyebrow="Accommodation"
        title="Room Requirements"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <NumberCard
            label="Twin Rooms"
            value={
              request.twinRooms ??
              0
            }
          />

          <NumberCard
            label="Double Rooms"
            value={
              request.doubleRooms ??
              0
            }
          />

          <NumberCard
            label="Single Rooms"
            value={
              request.singleRooms ??
              0
            }
          />

          <NumberCard
            label="Triple Rooms"
            value={
              request.tripleRooms ??
              0
            }
          />

          <NumberCard
            label="Total Rooms"
            value={roomTotal}
          />
        </div>

        {request.roomPreference ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              Rooming Notes
            </p>

            <p className="mt-2 text-sm text-slate-700">
              {
                request.roomPreference
              }
            </p>
          </div>
        ) : null}
      </InfoSection>

      {/* ======================================================
          PILGRIMAGE REQUIREMENTS
      ====================================================== */}

      <InfoSection
        icon={
          <Church className="h-5 w-5" />
        }
        eyebrow="Spiritual Program"
        title="Pilgrimage Requirements"
      >
        <InfoGrid>
          <InfoItem
            label="Daily Mass Requested"
            value={yesNo(
              request.dailyMassRequested,
            )}
          />

          <InfoItem
            label="Priest / Chaplain Traveling"
            value={yesNo(
              request.priestTraveling,
            )}
          />

          <InfoItem
            label="Guide Language"
            value={
              request.guideLanguage ||
              "—"
            }
          />
        </InfoGrid>

        {request.specialChurchRequests ? (
          <LongTextBlock
            label="Special Churches / Shrines"
            value={
              request.specialChurchRequests
            }
          />
        ) : null}
      </InfoSection>

      {/* ======================================================
          SERVICES + COMMERCIAL
      ====================================================== */}

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoSection
          icon={
            <Plane className="h-5 w-5" />
          }
          eyebrow="Services"
          title="Service Preferences"
        >
          <InfoGrid>
            <InfoItem
              label="Land Only"
              value={yesNo(
                request.landOnly,
              )}
            />

            <InfoItem
              label="Flights Requested"
              value={yesNo(
                request.needsFlights,
              )}
            />

            <InfoItem
              label="Hotel Level"
              value={
                request.accommodationLevel
                  ? formatStatus(
                      request.accommodationLevel,
                    )
                  : "—"
              }
            />
          </InfoGrid>

          {request.extensionRequest ? (
            <LongTextBlock
              label="Extension / Additional Program"
              value={
                request.extensionRequest
              }
            />
          ) : null}
        </InfoSection>

        <InfoSection
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
          eyebrow="Commercial"
          title="Budget Reference"
        >
          <InfoGrid>
            <InfoItem
              label="Budget Per Person"
              value={formatMoney(
                request.budgetPerPerson,
                request.currency,
              )}
            />

            <InfoItem
              label="Total Budget"
              value={formatMoney(
                request.totalBudget,
                request.currency,
              )}
            />

            <InfoItem
              label="Currency"
              value={
                request.currency
              }
            />
          </InfoGrid>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            Budget figures are client
            targets only and should not
            be treated as confirmed
            selling or supplier rates.
          </div>
        </InfoSection>
      </section>

      {/* ======================================================
          CONTACT
      ====================================================== */}

      <InfoSection
        icon={
          <UserRound className="h-5 w-5" />
        }
        eyebrow="Client / Group Contact"
        title="Contact Information"
      >
        <InfoGrid>
          <InfoItem
            label="Organization"
            value={
              request.companyName ||
              "—"
            }
          />

          <InfoItem
            label="Contact Name"
            value={
              request.customerName ||
              "—"
            }
          />

          <InfoItem
            label="Email"
            value={
              request.customerEmail ||
              "—"
            }
          />

          <InfoItem
            label="Phone"
            value={
              request.customerPhone ||
              "—"
            }
          />
        </InfoGrid>
      </InfoSection>

      {/* ======================================================
          NOTES
      ====================================================== */}

      {(request.specialRequests ||
        request.notes) && (
        <InfoSection
          icon={
            <FileText className="h-5 w-5" />
          }
          eyebrow="Planning Notes"
          title="Special Requirements & Notes"
        >
          {request.specialRequests ? (
            <LongTextBlock
              label="Special Requirements"
              value={
                request.specialRequests
              }
            />
          ) : null}

          {request.notes ? (
            <LongTextBlock
              label="Additional Notes"
              value={
                request.notes
              }
            />
          ) : null}
        </InfoSection>
      )}

      {/* ======================================================
          QUOTES
      ====================================================== */}

      <InfoSection
        icon={
          <Route className="h-5 w-5" />
        }
        eyebrow="Quotation Workflow"
        title="Quotes"
      >
        {request.quotes.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">
              No quotation has been
              prepared for this request
              yet.
            </p>

            <Link
              href={`/admin/quotes/new?requestId=${request.id}`}
              className="mt-4 inline-flex rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Prepare First Quote
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Quote
                  </th>

                  <th className="px-4 py-3 text-left">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {request.quotes.map(
                  (quote) => (
                    <tr
                      key={quote.id}
                      className="border-t"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/quotes/${quote.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {quote.quoteReference ||
                            "Open Quote"}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        {formatStatus(
                          quote.status,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {formatMoney(
                          quote.totalAmount,
                          quote.currency,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(
                          quote.createdAt,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </InfoSection>

      {/* ======================================================
          ADMIN UPDATE
      ====================================================== */}

      <UpdateRequestForm
        id={request.id}
        currentStatus={
          request.status
        }
        currentReply={
          request.adminReply ??
          ""
        }
      />
    </div>
  );
}

// ============================================================
// SMALL UI COMPONENTS
// ============================================================

function InfoSection({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-[#8B0000]">
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
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

function InfoGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-[#001F3F]">
        {value}
      </p>
    </div>
  );
}

function NumberCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold text-[#001F3F]">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function LongTextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function JourneyFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}