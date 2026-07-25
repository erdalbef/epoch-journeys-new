import { JourneyCollection } from "@/types/journey";
import { Section, SectionHeading } from "@/components/ui";

interface DesignedForProps {
  journey: JourneyCollection;
}

export default function DesignedFor({
  journey,
}: DesignedForProps) {
  return (
    <Section className="relative overflow-hidden bg-[#F7F3EA]">
      {/* Subtle Background Details */}
      <div
        className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-white/70 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[#C9A24D]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <SectionHeading
          eyebrow={journey.designedFor.label}
          title={journey.designedFor.title}
          description={journey.designedFor.description}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {journey.designedFor.groups.map((group) => {
            const Icon = group.icon;

            return (
              <article
                key={`${journey.slug}-${group.title}`}
                className="group rounded-3xl border border-[#0B1F3A]/10 bg-white p-8 shadow-[0_12px_34px_rgba(11,31,58,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#C9A24D]/40 hover:shadow-[0_18px_42px_rgba(11,31,58,0.1)] sm:p-10"
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D] transition duration-300 group-hover:bg-[#C9A24D] group-hover:text-[#0B1F3A]">
                    <Icon
                      className="h-6 w-6"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl leading-tight text-[#0B1F3A] md:text-3xl">
                      {group.title}
                    </h3>

                    <div
                      className="mt-4 h-px w-14 bg-[#C9A24D]"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <p className="mt-6 text-base leading-8 text-stone-600">
                  {group.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-14 max-w-4xl border-t border-[#0B1F3A]/10 pt-10 text-center">
          <p className="font-serif text-xl italic leading-8 text-[#0B1F3A] md:text-2xl">
            Every group is different. Each journey is thoughtfully adapted to
            its spiritual purpose, pace, and practical needs.
          </p>
        </div>
      </div>
    </Section>
  );
}