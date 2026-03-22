import Link from "next/link";

const themeItems = [
  {
    title: "Pilgrimage Tours",
    description:
      "Faith-based journeys designed with spiritual purpose, cultural context, and careful operational planning for churches, ministries, and religious groups.",
    points: [
      "Catholic and Christian pilgrimage programs",
      "Sacred sites, shrines, churches, and spiritual heritage",
      "Group-friendly planning with liturgical sensitivity",
    ],
  },
  {
    title: "Cultural Journeys",
    description:
      "Programs that connect travelers with the history, identity, and traditions of each destination through thoughtfully structured itineraries.",
    points: [
      "Historical cities and heritage-focused routes",
      "Art, architecture, traditions, and local context",
      "Designed for travelers seeking more than sightseeing",
    ],
  },
  {
    title: "Historical Programs",
    description:
      "Itineraries built around civilizations, empires, and major historical narratives, offering real depth for groups with educational or thematic interests.",
    points: [
      "Ancient, classical, Byzantine, and medieval themes",
      "Narrative-led itineraries with meaningful site selection",
      "Suitable for educational and affinity groups",
    ],
  },
  {
    title: "Custom Group Travel",
    description:
      "Tailor-made programs for agencies, institutions, organizations, and private groups with specific goals, interests, and travel profiles.",
    points: [
      "Customized pacing, inclusions, and route planning",
      "Adaptable for group size, budget, and audience",
      "Built in close collaboration with the partner",
    ],
  },
  {
    title: "Faith & Heritage Programs",
    description:
      "Journeys that combine spiritual significance with the wider cultural and historical setting of a destination for a more complete experience.",
    points: [
      "Balanced spiritual and cultural content",
      "Ideal for travelers seeking both reflection and discovery",
      "Well suited for mixed-interest religious groups",
    ],
  },
  {
    title: "Special Interest Series",
    description:
      "Programs built around a distinct theme, subject, or travel purpose for partners who want a more differentiated product offering.",
    points: [
      "Thematic concepts shaped around audience interest",
      "Suitable for niche groups and specialist travel sellers",
      "Designed to stand apart from standard touring",
    ],
  },
];

export default function ThemesPage() {
  return (
    <main className="bg-[#f8f9fb] text-black">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          Themes
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#001F3F] sm:text-5xl">
          Thoughtfully designed travel themes for professional partners
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Epoch Journeys develops travel programs around meaningful themes that
          help travel advisors, agencies, and group leaders offer more
          distinctive and more purposeful experiences.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {themeItems.map((item) => (
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
                {item.points.map((point) => (
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
                How We Build Themes
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#001F3F]">
                Structured around audience, purpose, and destination depth
              </h2>

              <p className="mt-6 text-base leading-8 text-gray-600">
                Our themes are not built as generic labels. Each program is
                shaped by the profile of the traveler, the purpose of the
                journey, and the cultural or spiritual identity of the
                destination itself.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="rounded-2xl border border-gray-200/70 bg-[#f8f9fb] p-6">
                <h3 className="text-lg font-semibold text-[#001F3F]">
                  Audience-Focused
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  We shape the theme around who the program is for, whether that
                  means pilgrimage groups, culturally curious travelers, private
                  groups, or specialist audiences.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200/70 bg-[#f8f9fb] p-6">
                <h3 className="text-lg font-semibold text-[#001F3F]">
                  Destination-Led
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  We build around what the destination can genuinely offer,
                  rather than forcing a concept that does not fit the local
                  context or travel rhythm.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200/70 bg-[#f8f9fb] p-6">
                <h3 className="text-lg font-semibold text-[#001F3F]">
                  Operationally Practical
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Every theme is translated into a workable program with
                  attention to routing, pacing, logistics, and the expectations
                  of travel professionals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center sm:px-10 lg:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B0000]">
          Work With Us
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#001F3F]">
          Let’s shape the right thematic programs for your clients
        </h2>

        <p className="mt-6 text-lg leading-8 text-gray-600">
          Whether you are looking for pilgrimage journeys, cultural itineraries,
          historical routes, or custom group concepts, we are ready to help you
          build programs with clarity and purpose.
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