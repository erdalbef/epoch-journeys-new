export default function ThemesPage() {
  return (
    <main className="bg-white text-black">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          Travel Themes
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Journeys designed around meaning and context
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
          Epoch Journeys develops travel programs shaped by culture, history,
          and spiritual heritage, offering depth beyond traditional tourism.
        </p>
      </section>

      {/* Themes */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Cultural */}
          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Cultural Journeys
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-600">
              Explore Europe through its art, architecture, traditions, and
              living cultures. These programs focus on understanding local life
              and regional identity.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Art & architecture</li>
              <li>• Culinary experiences</li>
              <li>• Local traditions</li>
              <li>• City & regional discovery</li>
            </ul>
          </div>

          {/* Historical */}
          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Historical Expeditions
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-600">
              Travel through the civilizations, empires, and key historical
              events that shaped Europe and the Mediterranean world.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Ancient civilizations</li>
              <li>• Roman & Byzantine heritage</li>
              <li>• Medieval Europe</li>
              <li>• Historical routes</li>
            </ul>
          </div>

          {/* Pilgrimage */}
          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Pilgrimage Programs
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-600">
              Carefully designed journeys to sacred destinations and Christian
              heritage sites, combining faith, history, and meaningful
              experiences.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Biblical journeys</li>
              <li>• Early Christianity</li>
              <li>• Saints & pilgrimage sites</li>
              <li>• Religious heritage routes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Positioning Section */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          Our Approach
        </p>

        <h2 className="mt-3 text-3xl font-semibold text-[#001F3F] sm:text-4xl">
          Beyond standard travel programs
        </h2>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-600">
          Each journey is designed with a clear thematic focus, combining
          destination expertise, structured itineraries, and strong operational
          planning. Our goal is to create travel experiences that are both
          meaningful and professionally executed.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-[#001F3F]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center text-white sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Explore our travel programs
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Discover structured travel experiences built around culture,
            history, and spiritual heritage.
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