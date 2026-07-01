import Link from "next/link";
import { SectionDivider } from "@/components/ui";
import { JourneyCollection } from "@/types/journey";

interface JourneyHeroProps {
  journey: JourneyCollection;
}

export default function JourneyHero({
  journey,
}: JourneyHeroProps) {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${journey.heroImage})`,
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-950/60" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <div className="max-w-3xl text-white">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.35em] text-blue-200">
            {journey.eyebrow}
          </p>

          <h1 className="font-serif text-5xl leading-tight md:text-7xl">
            {journey.title}
          </h1>

          <p className="mt-6 text-2xl font-light text-blue-50 md:text-3xl">
            {journey.subtitle}
          </p>
           
           <div className="mt-8">
              <SectionDivider />
          </div>
          
          <p className="mt-8 max-w-2xl text-lg leading-8 text-stone-100">
            {journey.description}
          </p>

          <Link
            href={journey.buttonHref}
            className="mt-10 inline-flex rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wide text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-100"
          >
            {journey.buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}