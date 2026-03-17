export default function WhyPartnerPage() {
  return (
    <main className="bg-white text-black">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          Why Partner
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          A reliable partner for meaningful travel programs
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
          Epoch Journeys works with travel advisors, tour operators, and group
          leaders to deliver structured, high-quality travel experiences across
          Europe.
        </p>
      </section>

      {/* Key Points */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Structured Programs
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Clearly designed itineraries with defined logistics, pricing, and
              operational planning.
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Reliable Operations
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Strong local partnerships and on-ground coordination ensure smooth
              execution of every journey.
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Expertise & Experience
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Decades of experience in organizing cultural, historical, and
              pilgrimage travel programs.
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Flexible Collaboration
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              We support both group travel and tailor-made programs based on
              your client needs.
            </p>
          </div>
        </div>
      </section>

      {/* B2B Focus */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          B2B Focus
        </p>

        <h2 className="mt-3 text-3xl font-semibold text-[#001F3F] sm:text-4xl">
          Built exclusively for travel professionals
        </h2>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-600">
          Epoch Journeys is a B2B platform designed to support travel advisors,
          agencies, and group leaders. We provide the tools, structure, and
          support needed to develop and operate successful travel programs.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-[#001F3F]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center text-white sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Start working with us
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Join our network of travel professionals and access structured,
            high-quality travel programs across Europe.
          </p>

          <div className="mt-8">
            <a
              href="/request-partnership"
              className="inline-flex rounded-full bg-[#8B0000] px-6 py-3 text-sm font-medium text-white hover:bg-[#6f0000]"
            >
              Request Partnership
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}