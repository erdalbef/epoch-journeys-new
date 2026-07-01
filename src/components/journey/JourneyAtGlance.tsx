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
    <Section className="bg-stone-50">
      <SectionHeading
        eyebrow="Journey at a Glance"
        title="Thoughtfully Designed for Every Pilgrim"
      />

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {journey.glance.map((item) => (
          <InfoCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            text={item.text}
          />
        ))}
      </div>
    </Section>
  );
}