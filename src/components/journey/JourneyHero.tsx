import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SectionDivider } from "@/components/ui";
import { JourneyCollection } from "@/types/journey";

interface JourneyHeroProps {
  journey: JourneyCollection;
}

export default function JourneyHero({
  journey,
}: JourneyHeroProps) {
  const heroGlanceItems = journey.glance.slice(0, 3);

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${journey.heroImage})`,
        }}
      />

      {/* Navy Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07172D]/95 via-[#0B1F3A]/80 to-[#0B1F3A]/50" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-16">
        <div className="max-w-4xl text-white">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-10 flex flex-wrap items-center gap-2 text-sm text-white/70"
          >
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <ChevronRight
              size={14}
              aria-hidden="true"
            />

            <Link
              href="/pages/journeys"
              className="transition hover:text-white"
            >
              Journeys
            </Link>

            <ChevronRight
              size={14}
              aria-hidden="true"
            />

            <span className="text-white">
              {journey.title}
            </span>
          </nav>

          {/* Eyebrow */}
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-[#C9A24D]">
            {journey.eyebrow}
          </p>

          {/* Title */}
          <h1 className="max-w-3xl font-serif text-5xl leading-tight text-white md:text-7xl">
            {journey.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-3xl text-2xl font-light leading-relaxed text-blue-50 md:text-3xl">
            {journey.subtitle}
          </p>

          <div className="mt-8 max-w-xl">
            <SectionDivider />
          </div>

          {/* Description */}
          <p className="mt-8 max-w-2xl text-lg leading-8 text-stone-100">
            {journey.description}
          </p>

          {/* Calls to Action */}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#C9A24D] px-8 py-4 text-sm font-semibold uppercase tracking-wide text-[#0B1F3A] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              Become a Partner
            </Link>

            <Link
              href={journey.buttonHref}
              className="inline-flex items-center justify-center rounded-full border border-white/70 px-8 py-4 text-sm font-semibold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#0B1F3A]"
            >
              {journey.buttonText}
            </Link>
          </div>

          {/* Journey Highlights */}
          {heroGlanceItems.length > 0 && (
            <div
              className={`mt-14 grid max-w-4xl gap-6 border-t border-white/20 pt-8 ${
                heroGlanceItems.length === 1
                  ? "grid-cols-1"
                  : heroGlanceItems.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-3"
              }`}
            >
              {heroGlanceItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9A24D]/50 bg-[#0B1F3A]/50 text-[#C9A24D]">
                      <Icon
                        size={18}
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A24D]">
                        {item.title}
                      </p>

                      <p className="mt-2 text-base leading-6 text-white">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}