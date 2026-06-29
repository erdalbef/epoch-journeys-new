import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-black">
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/hero-pilgrimage-1.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-linear-to-r from-[#0B1F3A]/95 via-[#0B1F3A]/82 to-[#0B1F3A]/25" />
        <div className="absolute inset-0 bg-black/15" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-b from-transparent to-white" />

        <div className="relative flex min-h-[92vh] items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
            <div className="max-w-4xl text-white">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9A24D] sm:text-sm">
                Epoch Journeys
              </p>

              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)] sm:text-5xl lg:text-6xl">
                Specialists in Catholic Pilgrimages & Christian Heritage Journeys.
              </h1>

              <p className="mt-7 max-w-2xl text-xl leading-8 text-white/90">
                Headquartered in Europe. Serving Tailor-made Catholic Pilgrimages and Christian Heritage Journeys around the world.
              </p>

              <p className="mt-6 text-xl font-semibold text-[#C9A24D] sm:text-2xl">
                Thoughtfully Planned. Faithfully Delivered.
              </p>

              <p className="mt-8 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                Epoch Journeys is a Destination Management Company
                specializing in Catholic pilgrimages and Christian heritage
                journeys. We help travel agencies, dioceses, parishes, and
                religious organizations create meaningful journeys supported by
                trusted local expertise and seamless operations.
              </p>

              <div className="mt-10 flex flex-col gap-7 sm:flex-row sm:items-center">
                <Link
                  href="/request-partnership"
                  className="inline-flex items-center justify-center rounded-full bg-[#C9A24D] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0B1F3A] shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:bg-[#0B1F3A] hover:text-[#C9A24D]"
                >
                  Become a Partner
                </Link>

                <Link
                  href="/pages/contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-[#0B1F3A]"
                >
                  Request a Proposal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            The Epoch Promise
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
            Every Pilgrimage Begins with Purpose
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
            At Epoch Journeys, we create opportunities to deepen faith, discover
            Christian heritage, and strengthen communities.
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
            An epoch marks the beginning of a new chapter. We believe every
            pilgrimage marks the beginning of something meaningful—for pilgrims,
            for communities, and for the partnerships that make these journeys
            possible.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#0B1F3A] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(11,31,58,0.16)] transition hover:bg-[#C9A24D] hover:text-[#0B1F3A]"
            >
              Begin Your Partnership
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}