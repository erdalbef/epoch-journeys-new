import Link from "next/link";

const valueItems = [
  {
    title: "Cultural & Historical Depth",
    text: "Programs designed with real historical and cultural context, not generic itineraries.",
  },
  {
    title: "Pilgrimage Expertise",
    text: "Deep understanding of religious travel, including sacred sites, liturgical needs, and group dynamics.",
  },
  {
    title: "Reliable Operations",
    text: "Clear planning, professional coordination, and dependable delivery on the ground.",
  },
  {
    title: "Flexible Program Design",
    text: "Adaptable itineraries tailored for agencies, groups, and custom travel requests.",
  },
  {
    title: "Clear B2B Collaboration",
    text: "Transparent communication and structured processes for long-term partnerships.",
  },
  {
    title: "End-to-End Support",
    text: "From planning to execution, we support your programs at every stage.",
  },
];

const processItems = [
  {
    step: "01",
    title: "Understand your needs",
    text: "We align with your client profile, travel goals, and program expectations before shaping the right solution.",
  },
  {
    step: "02",
    title: "Design the program",
    text: "We create itineraries with cultural substance, practical flow, and the flexibility needed for B2B travel planning.",
  },
  {
    step: "03",
    title: "Execute professionally",
    text: "We manage the operational side with clarity and reliability so the experience is delivered with confidence.",
  },
];

export default function WhyPartnerPage() {
  return (
    <main className="bg-[#f8f9fb] text-black">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-18 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          Why Partner
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#001F3F] sm:text-5xl">
          A trusted partner for cultural and pilgrimage travel
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Epoch Journeys works exclusively with travel professionals to deliver
          thoughtfully designed programs across Europe and the Mediterranean,
          combining cultural depth with operational precision.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {valueItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
            >
              <h3 className="text-lg font-semibold text-[#001F3F]">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6 text-center sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold text-[#001F3F]">
            How we work
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our approach is structured, transparent, and designed for long-term
            collaboration with travel professionals.
          </p>

          <div className="mt-14 grid gap-10 text-left md:grid-cols-3">
            {processItems.map((item) => (
              <div key={item.step}>
                <p className="text-sm font-semibold tracking-[0.16em] text-[#8B0000]">
                  {item.step}
                </p>

                <h3 className="mt-3 text-lg font-semibold text-[#001F3F]">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center sm:px-10 lg:px-16">
        <h2 className="text-3xl font-semibold text-[#001F3F]">
          Let’s build strong travel programs together
        </h2>

        <p className="mt-6 text-lg leading-8 text-gray-600">
          Join our network of travel professionals and work with a partner
          focused on quality, clarity, and trust.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/request-partnership"
            className="rounded-full bg-[#8B0000] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#6f0000]"
          >
            Request Partnership
          </Link>
        </div>
      </section>
    </main>
  );
}