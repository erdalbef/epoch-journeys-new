import Image from "next/image";
import { MapPin } from "lucide-react";
import { JourneyCollection } from "@/types/journey";

interface DestinationCardsProps {
  journey: JourneyCollection;
}

export default function DestinationCards({
  journey,
}: DestinationCardsProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle Background Detail */}
      <div
        className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-[#F7F3EA] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        {/* Section Introduction */}
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C9A24D] sm:text-sm">
            {journey.destinations.label}
          </p>

          <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-tight text-[#0B1F3A] md:text-5xl lg:text-6xl">
            {journey.destinations.title}
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600 md:text-xl md:leading-9">
            {journey.destinations.description}
          </p>

          <div
            className="mt-8 h-px w-24 bg-[#C9A24D]"
            aria-hidden="true"
          />
        </div>

        {/* Destination Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {journey.destinations.items.map((destination) => (
            <article
              key={`${journey.slug}-${destination.name}`}
              className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_12px_34px_rgba(11,31,58,0.06)] transition duration-300 hover:-translate-y-2 hover:border-[#C9A24D]/40 hover:shadow-[0_20px_48px_rgba(11,31,58,0.12)]"
            >
              {/* Image */}
              <div className="relative h-72 overflow-hidden">
                <Image
                  src={destination.image}
                  alt={`${destination.name}, ${destination.country}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#07172D]/75 via-[#07172D]/10 to-transparent" />

                {/* Location Badge */}
                <div className="absolute bottom-5 left-5">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#0B1F3A]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    <MapPin
                      className="h-4 w-4 text-[#C9A24D]"
                      aria-hidden="true"
                    />
                    {destination.country}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="font-serif text-3xl leading-tight text-[#0B1F3A]">
                  {destination.name}
                </h3>

                <div
                  className="mt-5 h-px w-16 bg-[#C9A24D]"
                  aria-hidden="true"
                />

                <p className="mt-6 text-base leading-8 text-stone-600">
                  {destination.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Closing Statement */}
        <div className="mx-auto mt-16 max-w-4xl border-t border-stone-200 pt-10 text-center">
          <p className="font-serif text-xl italic leading-8 text-[#0B1F3A] md:text-2xl">
            Each shrine offers pilgrims a distinct encounter with prayer,
            history, devotion, and the living faith of the Church.
          </p>
        </div>
      </div>
    </section>
  );
}