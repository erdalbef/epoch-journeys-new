import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-black">
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/home-hero.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-linear-to-r from-[#001F3F]/88 via-[#001F3F]/65 to-transparent" />
        <div className="absolute inset-0 bg-black/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-b from-transparent to-white" />

        <div className="relative flex min-h-[92vh] items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
            <div className="max-w-2xl text-white">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 sm:text-sm">
                Epoch Journeys
              </p>

              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)] sm:text-5xl lg:text-6xl">
                Curated cultural, historical, and pilgrimage travel across
                Europe and the Mediterranean
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
                Designed for travel advisors, tour operators, and group leaders
                seeking meaningful programs with professional execution.
              </p>

              <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
                <Link
                  href="/request-partnership"
                  className="inline-flex items-center justify-center rounded-full bg-[#8B0000] px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:bg-[#6f0000] hover:shadow-[0_14px_34px_rgba(0,0,0,0.22)]"
                >
                  Request Partnership
                </Link>

                <Link
                  href="/pages/contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-[#001F3F]"
                >
                  Contact Us
                </Link>
              </div>

              <p className="mt-7 text-sm leading-6 text-white/80">
                B2B travel programs built with cultural depth, operational
                precision, and purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 pb-24 sm:px-10 lg:px-16">
        <div className="rounded-[2rem] border border-[#8B0000]/12 bg-[#faf7f4] p-8 text-center shadow-sm sm:p-10 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B0000]">
            Launch Notice
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#001F3F] sm:text-4xl">
            Our partner platform is entering its launch phase
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-gray-600">
            Epoch Journeys is preparing its B2B partner platform for launch.
            Travel professionals interested in cultural, historical, and
            pilgrimage programs are invited to request early access and connect
            with us directly.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#8B0000] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(139,0,0,0.16)] transition hover:bg-[#6f0000]"
            >
              Request Early Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}