import { JourneyCollection } from "@/types/journey";

interface OpeningReflectionProps {
  journey: JourneyCollection;
}



export default function OpeningReflection({
  journey,
}: OpeningReflectionProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-28">
        {/* Section Label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[0.35em] text-blue-700">
          {journey.reflection.label}
        </p>

        {/* Title */}
        <h2 className="mt-5 text-center font-serif text-4xl leading-tight text-stone-900 md:text-5xl">
          {journey.reflection.title}
        </h2>

        {/* Decorative Divider */}
        <div className="mx-auto mt-8 flex max-w-xs items-center gap-4">
          <div className="h-px flex-1 bg-yellow-400" />
          <span className="text-lg text-yellow-500">✠</span>
          <div className="h-px flex-1 bg-yellow-400" />
        </div>

        {/* Reflection Paragraphs */}
        <div className="mx-auto mt-12 max-w-3xl space-y-8">
          {journey.reflection.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-center text-lg leading-9 text-stone-700"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Brand Statement */}
        <div className="mt-16 text-center">
          <p className="font-serif text-2xl italic text-blue-950">
            Thoughtfully Planned.
            <br />
            Faithfully Delivered.
          </p>
        </div>
      </div>
    </section>
  );
}