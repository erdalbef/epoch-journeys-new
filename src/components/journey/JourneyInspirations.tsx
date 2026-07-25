import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JourneyCollection } from "@/types/journey";
import { Section, SectionHeading } from "@/components/ui";

interface JourneyInspirationsProps {
  journey: JourneyCollection;
}

export default function JourneyInspirations({
  journey,
}: JourneyInspirationsProps) {
  return (
    <Section className="relative overflow-hidden bg-white">
      {/* Subtle Background Details */}
      <div
        className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-[#F7F3EA] blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#C9A24D]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <SectionHeading
          eyebrow="Signature Journey Ideas"
          title="Inspiration for Your Next Pilgrimage"
          description="These sample journeys illustrate the possibilities available through Epoch Journeys. Every pilgrimage is thoughtfully tailored to your group’s spiritual objectives, preferred pace, interests, and practical requirements."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {journey.journeyInspirations.map((item) => (
            <article
              key={`${journey.slug}-${item.title}`}
              className="group flex h-full flex-col rounded-3xl border border-stone-200 bg-[#FDFCF9] p-8 shadow-[0_12px_34px_rgba(11,31,58,0.05)] transition duration-300 hover:-translate-y-2 hover:border-[#C9A24D]/40 hover:shadow-[0_20px_48px_rgba(11,31,58,0.12)] sm:p-10"
            >
              {/* Journey Label */}
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
                Featured Journey
              </p>

              {/* Duration */}
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#0B1F3A]/70">
                {item.days}
              </p>

              {/* Title */}
              <h3 className="mt-5 font-serif text-3xl leading-tight text-[#0B1F3A]">
                {item.title}
              </h3>

              {/* Countries */}
              <p className="mt-3 text-base leading-7 text-stone-500">
                {item.countries}
              </p>

              <div
                className="mt-6 h-px w-16 bg-[#C9A24D]"
                aria-hidden="true"
              />

              {/* Theme */}
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#0B1F3A]">
                {item.theme}
              </p>

              {/* Description */}
              <p className="mt-5 flex-1 text-base leading-8 text-stone-600">
                {item.description}
              </p>

              {/* Link */}
              <Link
                href={item.href}
                className="mt-9 inline-flex items-center gap-2 self-start text-sm font-semibold text-[#0B1F3A] transition duration-300 hover:text-[#C9A24D]"
              >
                Explore This Journey

                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </article>
          ))}
        </div>

        {/* Closing Statement */}
        <div className="mx-auto mt-20 max-w-4xl border-t border-stone-200 pt-10 text-center">
          <p className="font-serif text-xl italic leading-8 text-[#0B1F3A] md:text-2xl">
            No two pilgrimage groups are the same. Every Epoch Journey is
            thoughtfully adapted to reflect your community, spiritual goals,
            preferred pace, and practical requirements.
          </p>
        </div>
      </div>
    </Section>
  );
}