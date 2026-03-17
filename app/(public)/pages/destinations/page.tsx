export default function DestinationsPage() {
  return (
    <main className="bg-white text-black">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          Destinations
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Travel programs across Europe and the Mediterranean
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg">
          Epoch Journeys develops cultural, historical, and pilgrimage travel
          programs across destinations known for their rich heritage, diverse
          traditions, and historical significance.
        </p>
      </section>

      {/* Regions */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Mediterranean Europe
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Programs across southern Europe and the wider Mediterranean world,
              combining culture, history, pilgrimage, and coastal landscapes.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Greece</li>
              <li>• Italy</li>
              <li>• Spain</li>
              <li>• Turkey</li>
              <li>• Portugal</li>
            </ul>
          </div>

          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Central Europe
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Destinations shaped by imperial history, architectural heritage,
              and some of Europe’s most celebrated urban and cultural centers.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Austria</li>
              <li>• Czech Republic</li>
              <li>• Hungary</li>
              <li>• Germany</li>
              <li>• Poland</li>
            </ul>
          </div>

          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Eastern Europe
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Regions where empires, traditions, and cultural crossroads created
              distinctive travel experiences with strong historical depth.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Romania</li>
              <li>• Croatia</li>
              <li>• The Balkans</li>
              <li>• Bulgaria</li>
              <li>• Serbia</li>
            </ul>
          </div>

          <div className="rounded-3xl border p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Pilgrimage Routes
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Sacred destinations and faith-based routes that connect travelers
              with Christian heritage, saints, shrines, and important places of
              pilgrimage.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-500">
              <li>• Santiago de Compostela</li>
              <li>• Lourdes</li>
              <li>• Fatima</li>
              <li>• Rome & the Vatican</li>
              <li>• Early Christian routes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-10 lg:px-16">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
          Geographic Scope
        </p>

        <h2 className="mt-3 text-3xl font-semibold text-[#001F3F] sm:text-4xl">
          Destinations selected with purpose
        </h2>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-600">
          Our destination portfolio is shaped by the same principle as our
          journeys: each program should connect travelers with the deeper
          history, culture, and spiritual identity of a place.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-[#001F3F]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center text-white sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Partner with us across Europe
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base text-white/80">
            Work with Epoch Journeys to offer meaningful travel programs across
            culturally and historically significant destinations.
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