import { JourneyCollection } from "@/types/journey";

import {
  InfoCard,
  Section,
  SectionHeading,
} from "@/components/ui";

interface JourneyAtGlanceProps {
  journey: JourneyCollection;
}

export default function JourneyAtGlance({
  journey,
}: JourneyAtGlanceProps) {
  return (
    <Section className="relative overflow-hidden bg-[#F7F3EA]">
      {/* Subtle Background Detail */}
      <div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-white/70 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <SectionHeading
          eyebrow="Journey at a Glance"
          title="Thoughtfully Designed for Every Pilgrim"
        />

        <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-8 text-stone-600">
          Each journey is shaped around spiritual purpose, meaningful
          encounters, thoughtful pacing, and the practical needs of the group.
        </p>

        <div
          className={`mt-14 grid gap-6 sm:grid-cols-2 ${
            journey.glance.length === 3
              ? "lg:grid-cols-3"
              : "lg:grid-cols-4"
          }`}
        >
          {journey.glance.map((item) => (
            <InfoCard
              key={`${journey.slug}-${item.title}`}
              icon={item.icon}
              title={item.title}
              text={item.text}
            />
          ))}
        </div>

        {/* Supporting Statement */}
        <div className="mx-auto mt-14 max-w-4xl border-t border-[#0B1F3A]/10 pt-10 text-center">
          <p className="font-serif text-xl italic leading-8 text-[#0B1F3A] md:text-2xl">
            Every detail is considered so pilgrims can remain focused on the
            meaning of the journey.
          </p>
        </div>
      </div>
    </Section>
  );
}