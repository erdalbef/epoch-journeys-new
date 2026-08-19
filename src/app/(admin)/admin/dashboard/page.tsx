import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookOpenCheck,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Headphones,
  Landmark,
  PlaneTakeoff,
  ReceiptText,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { OperationStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const money = (
  value: number,
  currency = "EUR"
) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const shortDate = (value: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

export default async function AdminDashboardPage() {
  const session =
    await getServerSession(
      authOptions
    );

  if (
    !session?.user ||
    session.user.role !== "ADMIN"
  ) {
    redirect("/admin-login");
  }

  const now = new Date();

  const in90Days =
    new Date(now);

  in90Days.setDate(
    in90Days.getDate() + 90
  );

  const [
    bookingSummary,
    confirmedBookings,
    pendingBookings,
    totalGuests,
    paymentSummary,
    pendingExpenseSummary,
    pendingAgents,
    notReadyBookings,
    draftQuotes,
    openRequests,
    openSupport,
    upcomingDepartures,
    recentBookings,
  ] = await Promise.all([
    db.booking.aggregate({
      _count: {
        _all: true,
      },

      _sum: {
        grossAmount: true,
        amountPaid: true,
        amountDue: true,
      },
    }),

    db.booking.count({
      where: {
        status: "CONFIRMED",
      },
    }),

    db.booking.count({
      where: {
        status: "PENDING",
      },
    }),

    db.booking.aggregate({
      _sum: {
        numberOfGuests: true,
      },
    }),

    db.payment
      .aggregate({
        where: {
          status: "RECEIVED",
        },

        _sum: {
          amount: true,
        },
      })
      .catch(() => ({
        _sum: {
          amount: null,
        },
      })),

    db.expense.aggregate({
      where: {
        paymentStatus: "PENDING",
      },

      _sum: {
        baseAmount: true,
      },

      _count: {
        _all: true,
      },
    }),

    db.user.count({
      where: {
        role: "AGENT",
        approved: false,
      },
    }),

    db.booking.count({
      where: {
        OR: [
          {
            operationControl: null,
          },

          {
            operationControl: {
              status: {
                in: [
                  OperationStatus.PENDING,
                  OperationStatus.IN_PROGRESS,
                ],
              },
            },
          },
        ],
      },
    }),

    db.quote.count({
      where: {
        status: "DRAFT",
      },
    }),

    db.customTourRequest.count({
      where: {
        status: {
          in: [
            "NEW",
            "IN_REVIEW",
          ],
        },
      },
    }),

    db.supportMessage.count({
      where: {
        status: "OPEN",
      },
    }),

    db.departureDate.findMany({
      where: {
        date: {
          gte: now,
          lte: in90Days,
        },

        status: {
          in: [
            "AVAILABLE",
            "EARLY_BOOKING",
          ],
        },
      },

      take: 6,

      orderBy: {
        date: "asc",
      },

      include: {
        tour: {
          select: {
            title: true,
          },
        },
      },
    }),

    db.booking.findMany({
      take: 6,

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        bookingReference: true,
        tourTitleSnapshot: true,
        agencyNameSnapshot: true,
        customerName: true,
        status: true,
        grossAmount: true,
        currency: true,
        numberOfGuests: true,
        createdAt: true,
      },
    }),
  ]);

  const totalBookings =
    bookingSummary._count._all;

  const grossSales =
    bookingSummary._sum
      .grossAmount ?? 0;

  const bookingPaid =
    bookingSummary._sum
      .amountPaid ?? 0;

  const collected =
    paymentSummary._sum
      .amount ??
    bookingPaid;

  const outstanding =
    Math.max(
      bookingSummary._sum
        .amountDue ?? 0,
      grossSales -
        bookingPaid,
      0
    );

  const guests =
    totalGuests._sum
      .numberOfGuests ?? 0;

  const pendingExpenses =
    pendingExpenseSummary
      ._sum.baseAmount ?? 0;

  const priorities = [
    {
      label:
        "Operations requiring attention",

      count:
        notReadyBookings,

      href:
        "/admin/bookings?operation=not-ready",

      detail:
        "Bookings not yet operationally ready",

      tone:
        "red",

      icon:
        AlertTriangle,
    },

    {
      label:
        "Pending agent approvals",

      count:
        pendingAgents,

      href:
        "/admin/agents",

      detail:
        "Partners waiting for access",

      tone:
        "amber",

      icon:
        UserCheck,
    },

    {
      label:
        "Custom requests",

      count:
        openRequests,

      href:
        "/admin/custom-requests",

      detail:
        "New or currently under review",

      tone:
        "blue",

      icon:
        Sparkles,
    },

    {
      label:
        "Draft quotes",

      count:
        draftQuotes,

      href:
        "/admin/quotes",

      detail:
        "Quotes still being prepared",

      tone:
        "purple",

      icon:
        FileText,
    },

    {
      label:
        "Open support requests",

      count:
        openSupport,

      href:
        "/admin/support",

      detail:
        "Agent questions awaiting action",

      tone:
        "slate",

      icon:
        Headphones,
    },
  ];

  const toneClasses:
    Record<
      string,
      string
    > = {
    red:
      "border-red-200 bg-red-50 text-red-900",

    amber:
      "border-amber-200 bg-amber-50 text-amber-900",

    blue:
      "border-blue-200 bg-blue-50 text-blue-900",

    purple:
      "border-purple-200 bg-purple-50 text-purple-900",

    slate:
      "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-3xl bg-[#001F3F] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              Epoch Journeys · Admin
              Control Center
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Good to see you
              {session.user.name
                ? `, ${session.user.name}`
                : ""}
              .
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Your business,
              sales, finance,
              and operational
              priorities in one
              place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/quotes/new"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] hover:bg-slate-100"
            >
              Create Quote
            </Link>

            <Link
              href="/admin/tours/create"
              className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
            >
              Add Tour
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
              Action first
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Today&apos;s
              priorities
            </h2>
          </div>

          <span className="hidden text-sm text-slate-500 sm:block">
            Only items that
            need attention
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {priorities.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    toneClasses[
                      item.tone
                    ]
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5" />

                    <span className="text-2xl font-bold">
                      {
                        item.count
                      }
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold">
                    {
                      item.label
                    }
                  </p>

                  <p className="mt-1 text-xs opacity-70">
                    {
                      item.detail
                    }
                  </p>
                </Link>
              );
            }
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Business health
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Performance
            overview
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Gross booking value",

              value:
                money(
                  grossSales
                ),

              detail:
                `${totalBookings} total bookings`,

              icon:
                TrendingUp,

              href:
                "/admin/bookings",
            },

            {
              label:
                "Collected",

              value:
                money(
                  collected
                ),

              detail:
                "Recorded customer payments",

              icon:
                CircleDollarSign,

              href:
                "/admin/payments",
            },

            {
              label:
                "Outstanding",

              value:
                money(
                  outstanding
                ),

              detail:
                "Booking balance still due",

              icon:
                Clock3,

              href:
                "/admin/payments",
            },

            {
              label:
                "Travelers",

              value:
                guests.toLocaleString(),

              detail:
                `${confirmedBookings} confirmed bookings`,

              icon:
                Users,

              href:
                "/admin/bookings",
            },
          ].map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
                      <Icon className="h-5 w-5" />
                    </span>

                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>

                  <p className="mt-5 text-sm font-medium text-slate-500">
                    {
                      item.label
                    }
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {
                      item.value
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      item.detail
                    }
                  </p>
                </Link>
              );
            }
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            label="Confirmed"
            value={
              confirmedBookings
            }
            icon={
              CheckCircle2
            }
          />

          <MiniStat
            label="Pending bookings"
            value={
              pendingBookings
            }
            icon={
              Clock3
            }
          />

          <MiniStat
            label="Unpaid expenses"
            value={money(
              pendingExpenses
            )}
            icon={
              ReceiptText
            }
          />

          <MiniStat
            label="Expenses awaiting payment"
            value={
              pendingExpenseSummary
                ._count._all
            }
            icon={
              Banknote
            }
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-950">
                Upcoming
                departures
              </h2>

              <p className="text-sm text-slate-500">
                Next 90 days ·
                availability and
                load
              </p>
            </div>

            <Link
              href="/admin/tours"
              className="text-sm font-semibold text-[#001F3F]"
            >
              Manage tours
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingDepartures.length ===
            0 ? (
              <EmptyState text="No available departures in the next 90 days." />
            ) : (
              upcomingDepartures.map(
                (
                  departure
                ) => {
                  const pct =
                    departure.capacity >
                    0
                      ? Math.min(
                          100,
                          Math.round(
                            (departure.bookedSeats /
                              departure.capacity) *
                              100
                          )
                        )
                      : 0;

                  return (
                    <div
                      key={
                        departure.id
                      }
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <PlaneTakeoff className="h-4 w-4 text-[#8B0000]" />

                          <p className="font-semibold text-slate-900">
                            {
                              departure
                                .tour
                                .title
                            }
                          </p>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {shortDate(
                            departure.date
                          )}{" "}
                          ·{" "}
                          {
                            departure.bookedSeats
                          }
                          /
                          {departure.capacity ||
                            "—"}{" "}
                          seats
                        </p>

                        <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#001F3F]"
                            style={{
                              width:
                                `${pct}%`,
                            }}
                          />
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {departure.status.replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-950">
              Quick actions
            </h2>

            <p className="text-sm text-slate-500">
              Start common
              tasks without
              hunting through
              menus.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <QuickAction
              href="/admin/quotes/new"
              title="Create quote"
              detail="Build a client or partner proposal"
              icon={
                FileText
              }
            />

            <QuickAction
              href="/admin/tours/create"
              title="Add tour"
              detail="Create a new sellable product"
              icon={
                PlaneTakeoff
              }
            />

            <QuickAction
              href="/admin/bookings"
              title="Manage bookings"
              detail="Review reservations and travelers"
              icon={
                BookOpenCheck
              }
            />

            <QuickAction
              href="/admin/payments"
              title="Record payments"
              detail="Review collections and balances"
              icon={
                Landmark
              }
            />

            <QuickAction
              href="/admin/custom-requests"
              title="Custom requests"
              detail="Turn requests into quotes"
              icon={
                Sparkles
              }
            />

            <QuickAction
              href="/admin/agents"
              title="Manage agents"
              detail="Approvals and partner accounts"
              icon={
                Users
              }
            />

            <QuickAction
              href="/admin/accounting"
              title="Accounting Documents"
              detail="Monthly documents and accountant packages"
              icon={
                Calculator
              }
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-950">
              Recent bookings
            </h2>

            <p className="text-sm text-slate-500">
              Latest sales
              activity across
              the network.
            </p>
          </div>

          <Link
            href="/admin/bookings"
            className="text-sm font-semibold text-[#001F3F]"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Booking
                </th>

                <th className="px-5 py-3">
                  Tour
                </th>

                <th className="px-5 py-3">
                  Partner /
                  Client
                </th>

                <th className="px-5 py-3">
                  Guests
                </th>

                <th className="px-5 py-3">
                  Value
                </th>

                <th className="px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentBookings.map(
                (
                  booking
                ) => (
                  <tr
                    key={
                      booking.id
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-semibold text-[#001F3F]"
                      >
                        {
                          booking.bookingReference
                        }
                      </Link>

                      <p className="text-xs text-slate-400">
                        {shortDate(
                          booking.createdAt
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {
                        booking.tourTitleSnapshot
                      }
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {booking.agencyNameSnapshot ||
                        booking.customerName ||
                        "Direct"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {
                        booking.numberOfGuests
                      }
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {money(
                        booking.grossAmount,
                        booking.currency
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {
                          booking.status
                        }
                      </span>
                    </td>
                  </tr>
                )
              )}

              {recentBookings.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                  >
                    <EmptyState text="No bookings yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value:
    | string
    | number;
  icon:
    typeof CalendarDays;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <span className="rounded-xl bg-slate-100 p-2 text-[#001F3F]">
        <Icon className="h-4 w-4" />
      </span>

      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  detail,
  icon: Icon,
}: {
  href: string;
  title: string;
  detail: string;
  icon:
    typeof CalendarDays;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 p-4 transition hover:border-[#001F3F]/30 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-lg bg-[#001F3F]/5 p-2 text-[#001F3F]">
          <Icon className="h-4 w-4" />
        </span>

        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#8B0000]" />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </Link>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}