import Link from "next/link";
import {
  Church,
  Landmark,
  Heart,
  Cross,
  Map,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const collections = [
  {
    title: "Marian Pilgrimages",
    description:
      "Discover sacred places of Marian devotion, prayer, and renewal.",
    highlights: ["Lourdes", "Fátima", "Medjugorje", "Guadalupe (Coming Soon)"],
    icon: Heart,
    href: "/pages/journey-collections/marian-pilgrimages",
  },
  {
    title: "Footsteps of St. Paul",
    description:
      "Follow the missionary journeys that shaped early Christianity.",
    highlights: ["Greece", "Türkiye", "Malta", "Rome"],
    icon: Map,
    href: "/pages/journey-collections/footsteps-of-st-paul",
  },
  {
    title: "Sacred Italy",
    description:
      "Experience the heart of Catholic tradition through Rome, Assisi, saints, and shrines.",
    highlights: ["Rome", "Assisi", "Padua", "Loreto"],
    icon: Church,
    href: "/pages/journey-collections/sacred-italy",
  },
  {
    title: "The Holy Land",
    description:
      "Meaningful pilgrimages to the places where Scripture comes alive.",
    highlights: ["Jerusalem", "Galilee", "Bethlehem", "Jordan"],
    icon: Cross,
    href: "/pages/journey-collections/holy-land",
  },
  {
    title: "Christian Heritage & Sacred Europe",
    description:
      "Journeys through places where Christian history, culture, and faith meet.",
    highlights: ["Türkiye", "Greece", "France", "Central Europe"],
    icon: Landmark,
    href: "/pages/journey-collections/christian-heritage",
  },
  {
    title: "Custom Signature Pilgrimages",
    description:
      "Tailor-made journeys designed around your group’s faith, interests, and pilgrimage goals.",
    highlights: ["Custom routes", "Multi-country journeys", "Special groups"],
    icon: Sparkles,
    href: "/request-partnership",
  },
];

export default function JourneyCollectionsPage() {
  return (
    <main className="bg-white text-black">
      <section className="bg-[#F7F3EA] px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Journey Collections
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Signature Pilgrimages Across the Christian World
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Discover thoughtfully curated pilgrimage collections for agencies,
            dioceses, parishes, religious organizations, and pilgrimage leaders.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              Pilgrimage Collections
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Pilgrimages Designed Around Faith, History & Purpose
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_12px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1F3A] text-[#C9A24D]">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-[#0B1F3A]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-base leading-8 text-gray-600">
                    {item.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {item.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-center gap-3 text-sm text-gray-700"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#C9A24D]" />
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F3A]">
                    Discover Journeys
                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
            Tailor-Made Pilgrimages
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Every Pilgrimage Begins with a Conversation
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            These collections are starting points. Every Epoch pilgrimage is
            thoughtfully adapted to your group’s faith journey, expectations,
            schedule, and practical needs.
          </p>

          <div className="mt-9">
            <Link
              href="/request-partnership"
              className="inline-flex items-center justify-center rounded-full bg-[#C9A24D] px-8 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-white"
            >
              Become a Partner
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}