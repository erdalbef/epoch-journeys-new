import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JourneyCollection } from "@/types/journey";
import { Section } from "@/components/ui";

interface JourneyCTAProps {
  journey: JourneyCollection;
}

export default function JourneyCTA({
  journey,
}: JourneyCTAProps) {
  return (
    <Section className="relative overflow-hidden bg-[#0B1F3A] text-white">
      {/* Subtle Background Details */}
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-white/5 blur-3xl"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#C9A24D]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C9A24D] sm:text-sm">
          Begin Your Journey
        </p>

        <h2 className="mt-6 font-serif text-4xl leading-tight text-white md:text-5xl lg:text-6xl">
          {journey.cta.title}
        </h2>

        <div
          className="mx-auto mt-8 h-px w-24 bg-[#C9A24D]"
          aria-hidden="true"
        />

        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/75 md:text-xl md:leading-9">
          {journey.cta.description}
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href={journey.cta.buttonHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A24D] px-9 py-4 text-sm font-semibold uppercase tracking-wide text-[#0B1F3A] transition duration-300 hover:-translate-y-0.5 hover:bg-white"
          >
            {journey.cta.buttonText}
            <ArrowRight
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Link>

          <Link
            href="/request-partnership"
            className="inline-flex items-center justify-center rounded-full border border-white/60 px-9 py-4 text-sm font-semibold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#0B1F3A]"
          >
            Become a Partner
          </Link>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-sm leading-7 text-white/55">
          Every Epoch journey is thoughtfully adapted to the spiritual purpose,
          expectations, schedule, and practical needs of your group.
        </p>
      </div>
    </Section>
  );
}