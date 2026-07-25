import { Section, SectionHeading, SectionDivider } from "@/components/ui";

export default function EpochDifference() {
  return (
    <Section className="relative overflow-hidden bg-[#F7F3EA]">
      {/* Background Detail */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-white/70 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <SectionHeading
          eyebrow="The Epoch Difference"
          title="More Than Planning a Pilgrimage"
        />

        <div className="mx-auto mt-16 max-w-4xl">
          <h3 className="text-center font-serif text-3xl leading-tight text-[#0B1F3A] md:text-5xl">
            Every Journey Begins with Listening.
          </h3>

          <div className="mt-8 flex justify-center">
            <SectionDivider />
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-8">
            <p className="text-center text-lg leading-9 text-stone-600">
              Every pilgrimage tells a different story because every group has a
              different purpose, tradition, and community.
            </p>

            <p className="text-center text-lg leading-9 text-stone-600">
              Before we recommend hotels, design itineraries, or reserve
              churches, we begin by understanding the spiritual goals of your
              pilgrimage and the people who will travel with you.
            </p>

            <p className="text-center text-lg leading-9 text-stone-600">
              That philosophy shapes every recommendation we make—from daily
              Mass planning and sacred site visits to pacing, accommodation, and
              the smallest operational details.
            </p>

            <p className="text-center text-lg leading-9 text-stone-600">
              We believe thoughtful planning creates the freedom for pilgrims to
              focus on what truly matters: faith, fellowship, and the experience
              of the journey itself.
            </p>
          </div>

          <div className="mt-16 text-center">
            <div className="text-3xl text-[#C9A24D]">✠</div>

            <p className="mt-8 font-serif text-3xl italic leading-relaxed text-[#0B1F3A] md:text-4xl">
              Thoughtfully Planned.
              <br />
              <span className="text-[#C9A24D]">
                Faithfully Delivered.
              </span>
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}