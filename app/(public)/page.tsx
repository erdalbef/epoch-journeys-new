import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-black">
      {/* Hero */}
      <section className="relative isolate min-h-[84vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/home-hero.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-[#001F3F]/25" />

        <div className="relative flex min-h-[84vh] items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-16 lg:py-28">
            <div className="max-w-3xl text-white">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-white/80">
                Epoch Journeys
              </p>

              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Curated cultural, historical, and pilgrimage travel experiences
                across Europe.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
                Designed for travel advisors, tour operators, and group leaders.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/request-partnership"
                  className="rounded-full bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
                >
                  Request Partnership
                </Link>

                <Link
                  href="/pages/contact"
                  className="rounded-full border border-white/70 px-6 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-[#001F3F]"
                >
                  Contact Us
                </Link>
              </div>

              <p className="mt-6 text-sm text-white/80">
                Partner platform coming soon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Statement */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="space-y-6">
          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            Epoch Journeys designs cultural, historical, and pilgrimage travel
            experiences across Europe.
          </p>

          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            Our programs explore the civilizations, traditions, and sacred
            places that shaped the continent.
          </p>

          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            Each journey is developed through deep destination knowledge and
            decades of travel expertise.
          </p>
        </div>
      </section>

      {/* Early Access / Soft Launch */}
      <section className="mx-auto max-w-5xl px-6 py-12 pb-24 sm:px-10 lg:px-16">
        <div className="rounded-3xl border border-[#8B0000]/15 bg-[#faf7f4] p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
            Launch Notice
          </p>

          <h2 className="mt-3 text-3xl font-semibold text-[#001F3F] sm:text-4xl">
            Our partner platform is launching soon
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-600">
            The Epoch Journeys B2B platform is currently in its final
            preparation phase. Travel professionals interested in working with
            us are invited to leave their details and request early access.
          </p>

          <div className="mt-8">
            <Link
              href="/request-partnership"
              className="inline-flex rounded-full bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Join Early Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}