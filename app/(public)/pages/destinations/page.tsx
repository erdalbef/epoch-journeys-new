import Link from "next/link";

const destinationItems = [
  {
    title: "Greece",
    description:
      "A destination of pilgrimage, classical heritage, Byzantine history, and island culture, ideal for both spiritual and cultural programs.",
    highlights: [
      "St. Paul and early Christianity itineraries",
      "Classical heritage and archaeological sites",
      "Pilgrimage, islands, and group touring",
    ],
  },
  {
    title: "Turkey",
    description:
      "A uniquely layered destination where biblical history, early Christianity, ancient civilizations, and living culture meet.",
    highlights: [
      "Seven Churches and biblical heritage",
      "Ancient cities and cultural depth",
      "Cross-regional itineraries with strong variety",
    ],
  },
  {
    title: "Italy",
    description:
      "A cornerstone destination for Catholic pilgrimage, sacred heritage, art history, and curated city-based cultural programs.",
    highlights: [
      "Rome, Assisi, Padua, and Marian sites",
      "Catholic pilgrimage and sacred traditions",
      "Art, architecture, and historical cities",
    ],
  },
  {
    title: "Eastern Mediterranean",
    description:
      "A strong region for multi-country journeys that combine spiritual significance, historical depth, and destination diversity.",
    highlights: [
      "Pilgrimage and cultural combinations",
      "Ideal for broader regional programming",
      "Suitable for groups seeking a richer narrative journey",
    ],
  },
  {
    title: "Balkans",
    description:
      "A region of layered identities, Orthodox and Catholic heritage, and underexplored cultural routes for more distinctive group travel.",
    highlights: [
      "Religious heritage and regional history",
      "Cultural discovery beyond mainstream itineraries",
      "Strong potential for specialist groups",
    ],
  },
  {
    title: "Custom Multi-Country Programs",
    description:
      "Programs developed across multiple destinations for partners who want a broader concept, stronger differentiation, or a thematic route.",
    highlights: [
      "Tailor-made routing across regions",
      "Built around audience and program purpose",
      "Operationally structured for B2B use",
    ],
  },
];

const strengths = [
  {
    title: "Destination Knowledge",
    text: "We focus on places with real historical, cultural, and spiritual value rather than generic touring markets.",
  },
  {
    title: "Program Relevance",
    text: "Each destination is selected and shaped according to what it can genuinely offer to the traveler and the partner.",
  },
  {
    title: "B2B Practicality",
    text: "We translate destination richness into workable itineraries that support sales, planning, and delivery.",
  },
];

export default function DestinationsPage() {
  return (
    <main className="bg-[#f8f9fb] text-black">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          Destinations
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#001F3F] sm:text-5xl">
          Destinations selected for depth, meaning, and travel value
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Epoch Journeys focuses on destinations across Europe and the
          Mediterranean that offer strong cultural, historical, and pilgrimage
          value for thoughtfully designed B2B travel programs.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {destinationItems.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-gray-200/70 bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
            >
              <h2 className="text-xl font-semibold tracking-tight text-[#001F3F]">
                {item.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-gray-600">
                {item.description}
              </p>

              <ul className="mt-5 space-y-3">
                {item.highlights.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2.5 h-2 w-2 rounded-full bg-[#8B0000]" />
                    <span className="text-sm leading-7 text-gray-700">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B0000]">
                Our Destination Approach
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#001F3F]">
                Chosen for substance, not just popularity
              </h2>

              <p className="mt-6 text-base leading-8 text-gray-600">
                We do not approach destinations as simple lists of places to
                sell. We evaluate each destination for its narrative strength,
                its value to the traveler, and its practicality for the travel
                professional who needs a workable, high-quality program.
              </p>
            </div>

            <div className="grid gap-6">
              {strengths.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200/70 bg-[#f8f9fb] p-6"
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
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B0000]">
          Work With Us
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#001F3F]">
          Let us build the right destination portfolio for your clients
        </h2>

        <p className="mt-6 text-lg leading-8 text-gray-600">
          Whether you are planning pilgrimage travel, cultural programs, or
          custom multi-country itineraries, we are ready to help you shape a
          destination offering with clarity and purpose.
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