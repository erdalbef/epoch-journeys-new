import Link from "next/link";
import { Suspense } from "react";
import AgentLoginClient from "./AgentLoginClient";

function AgentLoginFallback() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="mb-8 hidden lg:block">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
          Secure Access
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Agent Login
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in to access your partner dashboard.
        </p>
      </div>

      <div className="space-y-4">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-11 w-full rounded-xl bg-slate-100" />
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-11 w-full rounded-xl bg-slate-100" />
        <div className="h-11 w-full rounded-xl bg-slate-200" />
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
        Not registered yet?{" "}
        <span className="font-semibold text-[#8B0000]">Request Partnership</span>
      </div>
    </div>
  );
}

export default function AgentLoginPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl items-center px-6 py-10 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:grid-cols-2">
          <section className="relative hidden min-h-155 overflow-hidden bg-[#0B1F3A] lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(139,0,0,0.22),transparent_30%)]" />

            <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
                  Epoch Journeys Partner Portal
                </div>

                <div className="mt-8 max-w-xl">
                  <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                    Access your professional B2B travel dashboard
                  </h1>
                  <p className="mt-5 max-w-lg text-base leading-7 text-slate-200 xl:text-lg">
                    Manage bookings, review departures, access brochures, and
                    work with curated tour products designed for travel
                    professionals and group leaders.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-sm font-semibold text-white">
                    Booking Management
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Review active bookings, departure details, and partner
                    booking records in one place.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-sm font-semibold text-white">
                    Agent Resources
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Download brochures, tour documents, and sales materials for
                    your clients.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-155 items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-12">
            <div className="w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0B1F3A]">
                  Partner Portal
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  Agent Login
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Access your dashboard to manage bookings, tours, and partner
                  resources.
                </p>
              </div>

              <Suspense fallback={<AgentLoginFallback />}>
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                  <div className="mb-8 hidden lg:block">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
                      Secure Access
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      Agent Login
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Sign in to access your partner dashboard.
                    </p>
                  </div>

                  <AgentLoginClient />

                  <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
                    Not registered yet?{" "}
                    <Link
                      href="/request-partnership"
                      className="font-semibold text-[#8B0000] transition hover:text-[#6f0000]"
                    >
                      Request Partnership
                    </Link>
                  </div>
                </div>
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}