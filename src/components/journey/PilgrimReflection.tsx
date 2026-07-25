import { JourneyCollection } from "@/types/journey";
import { Section, SectionDivider } from "@/components/ui";

interface PilgrimReflectionProps {
  journey: JourneyCollection;
}

export default function PilgrimReflection({
  journey,
}: PilgrimReflectionProps) {
  return (
    <Section className="relative overflow-hidden bg-white">
      {/* Background Detail */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#F7F3EA] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Section Label */}
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C9A24D] sm:text-sm">
          {journey.quote.label}
        </p>

        {/* Divider */}
        <div className="mt-8 flex justify-center">
          <SectionDivider />
        </div>

        {/* Quote */}
        <blockquote className="mx-auto mt-14 max-w-4xl">
          <p className="font-serif text-3xl italic leading-relaxed text-[#0B1F3A] md:text-5xl lg:text-6xl">
            “{journey.quote.text}”
          </p>

          <footer className="mt-10 text-lg font-medium tracking-wide text-stone-600">
            — {journey.quote.author}
          </footer>
        </blockquote>

        {/* Closing Reflection */}
        <div className="mx-auto mt-16 max-w-3xl border-t border-stone-200 pt-10">
          <p className="text-lg leading-8 text-stone-600">
            May every pilgrimage become more than a journey across countries—
            may it become a journey of faith, friendship, prayer, and lasting
            spiritual renewal.
          </p>

          <p className="mt-8 font-serif text-2xl italic leading-relaxed text-[#0B1F3A]">
            Thoughtfully Planned.
            <br />
            <span className="text-[#C9A24D]">
              Faithfully Delivered.
            </span>
          </p>
        </div>
      </div>
    </Section>
  );
}