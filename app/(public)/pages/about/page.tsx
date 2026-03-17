export default function AboutPage() {
  return (
    <main className="bg-white text-black">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          About Us
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Travel with context, meaning, and purpose
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
          Epoch Journeys designs cultural, historical, and pilgrimage travel
          experiences across Europe, built for travel advisors, tour operators,
          and group leaders.
        </p>
      </section>

      {/* Philosophy */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10 lg:px-16">
        <div className="space-y-6">
          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            Travel is not only about moving from place to place.
          </p>

          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            It is about understanding the civilizations, traditions, and beliefs
            that shaped the world.
          </p>

          <p className="text-lg leading-8 text-gray-700 sm:text-xl">
            Our journeys are designed to provide depth, context, and a meaningful
            connection with each destination.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
            What We Do
          </p>

          <h2 className="mt-3 text-3xl font-semibold text-[#001F3F] sm:text-4xl">
            Specialized travel programs
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Cultural Journeys
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Exploring art, architecture, traditions, and local life across
              Europe.
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Historical Programs
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Travel shaped around civilizations, empires, and key historical
              periods.
            </p>
          </div>

          <div className="rounded-2xl border p-6">
            <h3 className="text-lg font-semibold text-[#001F3F]">
              Pilgrimage Tours
            </h3>
            <p className="mt-3 text-sm text-gray-600 leading-7">
              Carefully designed journeys to Christian heritage and sacred
              destinations.
            </p>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10 lg:px-16">
        <div className="space-y-6 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
            Our Approach
          </p>

          <h2 className="text-3xl font-semibold text-[#001F3F] sm:text-4xl">
            Built for travel professionals
          </h2>

          <p className="mx-auto max-w-3xl text-base leading-7 text-gray-600">
            We work exclusively with travel advisors, agencies, and group
            leaders, providing structured, reliable, and well-managed travel
            programs. Our focus is on operational excellence, strong local
            partnerships, and long-term collaboration.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#001F3F]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center text-white sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Work with Epoch Journeys
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            We collaborate with travel professionals to deliver meaningful and
            well-structured travel experiences across Europe.
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