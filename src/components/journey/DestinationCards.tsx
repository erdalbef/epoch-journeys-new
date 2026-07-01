import Image from "next/image";
import { MapPin } from "lucide-react";
import { JourneyCollection } from "@/types/journey";

interface DestinationCardsProps {
  journey: JourneyCollection;
}

export default function DestinationCards({ journey }: DestinationCardsProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-700">
            {journey.destinations.label}
          </p>

          <h2 className="mt-5 font-serif text-4xl leading-tight text-stone-900 md:text-5xl">
            {journey.destinations.title}
          </h2>

          <p className="mt-6 text-lg leading-8 text-stone-700">
            {journey.destinations.description}
          </p>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {journey.destinations.items.map((destination) => (
            <article
              key={destination.name}
              className="group overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={destination.image}
                  alt={`${destination.name}, ${destination.country}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-stone-950/45 to-transparent" />
              </div>

              <div className="p-8">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
                  <MapPin className="h-4 w-4" />
                  {destination.country}
                </p>

                <h3 className="mt-3 font-serif text-3xl text-stone-900">
                  {destination.name}
                </h3>

                <div className="mt-5 h-px w-16 bg-yellow-400" />

                <p className="mt-6 leading-7 text-stone-700">
                  {destination.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}