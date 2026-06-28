// components/home/Hero.tsx

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#0B1F3A] text-white">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45"
        style={{
          backgroundImage: "url('/images/hero-pilgrimage.jpg')",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-[#0B1F3A] via-[#0B1F3A]/85 to-[#0B1F3A]/40" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl items-center px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-[#C9A24D]">
            Epoch Journeys
          </p>

          <h1 className="mb-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            European Specialists in Catholic Pilgrimages
          </h1>

          <p className="mb-5 text-xl leading-8 text-white/90">
            Tailor-made Catholic Pilgrimages and Christian Heritage Journeys
            across Europe and the Holy Land.
          </p>

          <p className="mb-8 text-lg font-medium text-[#C9A24D]">
            Thoughtfully Planned. Faithfully Delivered.
          </p>

          <p className="mb-10 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Epoch Journeys is a European Destination Management Company
            partnering with travel agencies, dioceses, parishes, churches, and
            religious organizations to design and deliver meaningful faith-based
            journeys with trusted local expertise and seamless operations.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/request-partnership"
              className="rounded-full bg-[#C9A24D] px-7 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#d8b865]"
            >
              Become a Partner
            </Link>

            <Link
              href="/contact"
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}