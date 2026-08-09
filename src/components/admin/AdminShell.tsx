"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Church,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  HandCoins,
  Headphones,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  TicketCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
  adminName: string;
  adminEmail?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: TicketCheck,
      },
      {
        label: "Quotes",
        href: "/admin/quotes",
        icon: FileText,
      },
      {
        label: "Quote Requests",
        href: "/admin/quote-requests",
        icon: MessageSquareText,
      },
      {
        label: "Custom Requests",
        href: "/admin/custom-requests",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Products",
    items: [
      {
        label: "Tours",
        href: "/admin/tours",
        icon: Map,
      },
      {
        label: "Booking Calendar",
        href: "/admin/bookings/calendar",
        icon: CalendarDays,
      },
      {
        label: "Quote Templates",
        href: "/admin/quotes/templates",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: "Partners",
    items: [
      {
        label: "Agents",
        href: "/admin/agents",
        icon: Users,
      },
      {
        label: "Suppliers",
        href: "/admin/suppliers",
        icon: Building2,
      },
      {
        label: "Mass Arrangements",
        href: "/admin/mass-arrangements",
        icon: Church,
      },
      {
        label: "Payouts",
        href: "/admin/payouts",
        icon: HandCoins,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Finance Center",
        href: "/admin/finance",
        icon: CircleDollarSign,
      },
      {
        label: "Profitability",
        href: "/admin/finance/profitability",
        icon: ChartNoAxesCombined,
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
      },
      {
        label: "Expenses",
        href: "/admin/finance/expenses",
        icon: ReceiptText,
      },
      {
        label: "Supplier Payables",
        href: "/admin/supplier-payables",
        icon: HandCoins,
      },
      {
        label: "Bank Accounts",
        href: "/admin/finance/bank-accounts",
        icon: WalletCards,
      },
      {
        label: "Documents",
        href: "/admin/finance/documents",
        icon: FileText,
      },
      {
        label: "Sales Documents",
        href: "/admin/finance/sales-documents",
        icon: ReceiptText,
      },
    ],
  },
  {
    label: "Service",
    items: [
      {
        label: "Support",
        href: "/admin/requests",
        icon: Headphones,
      },
    ],
  },
];

const searchItems = navSections.flatMap(
  (section) => section.items,
);

function isActivePath(
  pathname: string,
  href: string,
) {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  if (href === "/admin/finance") {
    return pathname === "/admin/finance";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function AdminNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-5">
        {navSections.map(
          (
            section,
            sectionIndex,
          ) => (
            <div
              key={
                section.label ??
                `primary-${sectionIndex}`
              }
            >
              {section.label &&
              !collapsed ? (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {section.label}
                </p>
              ) : section.label &&
                collapsed ? (
                <div className="mx-3 mb-2 border-t border-white/10" />
              ) : null}

              <div className="space-y-1">
                {section.items.map(
                  (item) => {
                    const active =
                      isActivePath(
                        pathname,
                        item.href,
                      );

                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        onClick={
                          onNavigate
                        }
                        title={
                          collapsed
                            ? item.label
                            : undefined
                        }
                        className={cn(
                          "group flex min-h-10 items-center rounded-xl text-sm font-medium transition",
                          collapsed
                            ? "justify-center px-2"
                            : "gap-3 px-3",
                          active
                            ? "bg-white text-[#001F3F] shadow-sm"
                            : "text-slate-300 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active
                              ? "text-[#8B0000]"
                              : "text-slate-400 group-hover:text-white",
                          )}
                        />

                        {!collapsed && (
                          <span>
                            {
                              item.label
                            }
                          </span>
                        )}
                      </Link>
                    );
                  },
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}

function WorkspaceSearch({
  onClose,
}: {
  onClose?: () => void;
}) {
  const router = useRouter();

  const [query, setQuery] =
    useState("");

  const matches =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return [];
      }

      return searchItems
        .filter((item) =>
          item.label
            .toLowerCase()
            .includes(
              normalized,
            ),
        )
        .slice(0, 6);
    }, [query]);

  const openItem = (
    href: string,
  ) => {
    setQuery("");
    onClose?.();
    router.push(href);
  };

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <input
        value={query}
        onChange={(event) =>
          setQuery(
            event.target.value,
          )
        }
        onKeyDown={(event) => {
          if (
            event.key ===
              "Enter" &&
            matches[0]
          ) {
            event.preventDefault();

            openItem(
              matches[0].href,
            );
          }
        }}
        placeholder="Search admin workspace..."
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#001F3F]/40 focus:bg-white focus:ring-4 focus:ring-[#001F3F]/5"
      />

      {query.trim() && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {matches.length >
          0 ? (
            <div className="space-y-1">
              {matches.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <button
                      key={
                        item.href
                      }
                      type="button"
                      onClick={() =>
                        openItem(
                          item.href,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />

                      <span>
                        {
                          item.label
                        }
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500">
              No admin section
              matches “{query}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminShell({
  children,
  adminName,
  adminEmail,
}: AdminShellProps) {
  const pathname =
    usePathname();

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    quickOpen,
    setQuickOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const quickActions: NavItem[] =
    [
      {
        label:
          "New Booking",
        href:
          "/admin/bookings/new",
        icon:
          BriefcaseBusiness,
      },
      {
        label: "New Quote",
        href:
          "/admin/quotes/new",
        icon: FileText,
      },
      {
        label: "New Tour",
        href:
          "/admin/tours/create",
        icon: Map,
      },
    ];

  const initials =
    adminName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase(),
      )
      .join("") || "A";

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      {/* ================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ================================================== */}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-[#001F3F] text-white shadow-xl transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed
            ? "w-[84px]"
            : "w-[264px]",
        )}
      >
        <div
          className={cn(
            "flex h-[76px] items-center border-b border-white/10",
            collapsed
              ? "justify-center px-3"
              : "px-5",
          )}
        >
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
              <Image
                src="/epoch-compass-logo.png"
                alt="Epoch Journeys"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
                  Epoch Journeys
                </p>

                <p className="truncate text-sm font-semibold text-white">
                  Admin Control
                  Center
                </p>
              </div>
            )}
          </Link>
        </div>

        <AdminNav
          pathname={pathname}
          collapsed={collapsed}
        />

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() =>
              setCollapsed(
                (value) =>
                  !value,
              )
            }
            className={cn(
              "flex h-10 w-full items-center rounded-xl text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white",
              collapsed
                ? "justify-center"
                : "gap-3 px-3",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}

            {!collapsed && (
              <span>
                Collapse menu
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ================================================== */}
      {/* MOBILE SIDEBAR */}
      {/* ================================================== */}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            type="button"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <aside className="relative flex h-full w-[min(88vw,320px)] flex-col bg-[#001F3F] text-white shadow-2xl">
            <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
              <Link
                href="/admin/dashboard"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5">
                  <Image
                    src="/epoch-compass-logo.png"
                    alt="Epoch Journeys"
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-200">
                    Epoch Journeys
                  </p>

                  <p className="text-sm font-semibold">
                    Admin Control
                    Center
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AdminNav
              pathname={pathname}
              collapsed={false}
              onNavigate={() =>
                setMobileOpen(
                  false,
                )
              }
            />
          </aside>
        </div>
      )}

      {/* ================================================== */}
      {/* PAGE AREA */}
      {/* ================================================== */}

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200",
          collapsed
            ? "lg:pl-[84px]"
            : "lg:pl-[264px]",
        )}
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center gap-3 px-4 md:px-6 xl:px-8">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  true,
                )
              }
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />

              <span className="sr-only">
                Open navigation
              </span>
            </button>

            <div className="hidden w-full max-w-[480px] md:block">
              <WorkspaceSearch />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* =========================================== */}
              {/* QUICK CREATE */}
              {/* =========================================== */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setQuickOpen(
                      (value) =>
                        !value,
                    )
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#8B0000] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#760000]"
                >
                  <Plus className="h-4 w-4" />

                  <span className="hidden sm:inline">
                    Quick create
                  </span>

                  <ChevronDown className="hidden h-4 w-4 sm:block" />
                </button>

                {quickOpen && (
                  <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {quickActions.map(
                      (action) => {
                        const Icon =
                          action.icon;

                        return (
                          <Link
                            key={
                              action.href
                            }
                            href={
                              action.href
                            }
                            onClick={() =>
                              setQuickOpen(
                                false,
                              )
                            }
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            <Icon className="h-4 w-4 text-[#8B0000]" />

                            {
                              action.label
                            }
                          </Link>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              {/* =========================================== */}
              {/* NOTIFICATIONS */}
              {/* =========================================== */}

              <Link
                href="/admin/agents"
                title="Agent activity and alerts"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#001F3F]"
              >
                <Bell className="h-[18px] w-[18px]" />
              </Link>

              {/* =========================================== */}
              {/* ADMIN PROFILE */}
              {/* =========================================== */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(
                      (value) =>
                        !value,
                    )
                  }
                  className="flex h-11 items-center gap-3 rounded-xl border border-transparent px-1.5 transition hover:border-slate-200 hover:bg-slate-50 sm:px-2"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#001F3F] text-xs font-bold text-white">
                    {initials}
                  </span>

                  <span className="hidden min-w-0 text-left xl:block">
                    <span className="block max-w-36 truncate text-sm font-semibold text-slate-800">
                      {adminName}
                    </span>

                    <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Administrator
                    </span>
                  </span>

                  <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-14 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {adminName}
                      </p>

                      {adminEmail && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {
                            adminEmail
                          }
                        </p>
                      )}
                    </div>

                    <Link
                      href="/admin/dashboard"
                      onClick={() =>
                        setProfileOpen(
                          false,
                        )
                      }
                      className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <LayoutDashboard className="h-4 w-4" />

                      Dashboard
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        signOut({
                          callbackUrl:
                            "/admin-login",
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#8B0000] transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />

                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =============================================== */}
          {/* MOBILE SEARCH */}
          {/* =============================================== */}

          <div className="border-t border-slate-100 px-4 py-3 md:hidden">
            <WorkspaceSearch />
          </div>
        </header>

        {/* ================================================= */}
        {/* PAGE CONTENT */}
        {/* ================================================= */}

        <main className="min-h-[calc(100vh-76px)]">
          {children}
        </main>
      </div>
    </div>
  );
}