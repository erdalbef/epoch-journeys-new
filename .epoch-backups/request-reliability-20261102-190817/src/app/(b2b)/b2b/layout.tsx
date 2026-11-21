import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  const userName =
    session?.user?.fullName ||
    session?.user?.name ||
    session?.user?.email ||
    "Agent";

  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          partnerType: true,
          fullName: true,
          travelAgency: true,
        },
      })
    : null;

  const isGroupLeader = user?.partnerType === "GROUP_LEADER";

  const navItems = [
    { href: "/b2b/dashboard", label: "Dashboard" },
    { href: "/b2b/tours", label: "Tours" },
    { href: "/b2b/bookings", label: "Bookings" },
    {
      href: "/b2b/commissions",
      label: isGroupLeader ? "Payouts" : "Commissions",
    },
    { href: "/b2b/payments", label: "Payments" },
    { href: "/b2b/resources", label: "Resources" },
    { href: "/b2b/support", label: "Support" },
    { href: "/b2b/profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r bg-white lg:flex lg:flex-col">
          <div className="border-b px-6 py-5">
            <div className="text-lg font-bold text-[#001F3F]">
              Epoch Journeys
            </div>
            <div className="text-sm text-muted-foreground">B2B Portal</div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-red-50 hover:text-red-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t px-6 py-4">
            <div className="text-sm font-medium text-[#001F3F]">{userName}</div>

            {user?.travelAgency ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {user.travelAgency}
              </div>
            ) : null}

            <div className="mt-1 text-xs text-muted-foreground">
              {isGroupLeader
                ? "Approved Group Leader"
                : "Approved B2B Partner"}
            </div>

            <form action="/api/auth/signout" method="post" className="mt-4">
              <button
                type="submit"
                className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              >
                Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#001F3F]">
                  Epoch Journeys | B2B
                </div>
                <div className="text-sm text-muted-foreground">
                  {isGroupLeader
                    ? "Group leader dashboard and booking tools"
                    : "Partner dashboard and booking tools"}
                </div>
              </div>

              <div className="hidden text-sm text-gray-600 md:block">
                Welcome, {userName}
              </div>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto lg:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}