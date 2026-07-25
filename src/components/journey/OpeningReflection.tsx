import { JourneyCollection } from "@/types/journey";

interface OpeningReflectionProps {
  journey: JourneyCollection;
}

export default function OpeningReflection({
  journey,
}: OpeningReflectionProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle Background Detail */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#F7F3EA] blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        {/* Section Heading */}
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C9A24D] sm:text-sm">
            {journey.reflection.label}
          </p>

          <h2 className="mt-5 font-serif text-4xl leading-tight text-[#0B1F3A] md:text-5xl lg:text-6xl">
            {journey.reflection.title}
          </h2>

          {/* Decorative Divider */}
          <div
            className="mx-auto mt-8 flex max-w-xs items-center gap-4"
            aria-hidden="true"
          >
            <div className="h-px flex-1 bg-[#C9A24D]/60" />
            <span className="font-serif text-xl text-[#C9A24D]">✠</span>
            <div className="h-px flex-1 bg-[#C9A24D]/60" />
          </div>
        </div>

        {/* Reflection Content */}
        <div className="mx-auto mt-12 max-w-3xl space-y-7 md:mt-14">
          {journey.reflection.paragraphs.map((paragraph, index) => (
            <p
              key={`${journey.slug}-reflection-${index}`}
              className="text-center text-lg leading-9 text-stone-600 md:text-xl md:leading-10"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Brand Statement */}
        <div className="mx-auto mt-16 max-w-2xl border-t border-stone-200 pt-10 text-center">
          <p className="font-serif text-2xl italic leading-relaxed text-[#0B1F3A] md:text-3xl">
            Thoughtfully Planned.
            <br />
            <span className="text-[#C9A24D]">
              Faithfully Delivered.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}